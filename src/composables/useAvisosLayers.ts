import { watch } from 'vue'
import L from 'leaflet'
import { useAvisosStore } from '@/stores/avisosStore'
import type { AvisoFeature } from '@/stores/avisosStore'
import { MAP_PANES } from '@/config/panes/mapPanes'
import router from '@/router'

type LonLat = [number, number]

// CAP's `polygon` field is a space-separated list of "lat,lon" pairs. Some
// avisos arrive with it corrupted in two ways we've seen in practice: a
// missing space merges two pairs into one 4-number token (silently losing
// a vertex if naively parsed by taking only the first two numbers per
// token), or two entirely separate, disjoint loops end up concatenated
// into a single point list with no boundary marker between them, leaving
// the shared "bridge" vertex where they joined repeated verbatim. Both
// turn into a long spurious edge that crosses the rest of the shape when
// rendered as one ring — this recovers the original loop(s) from the raw
// text instead of trusting whatever ring the upstream feed/backend built.
function parseCapPolygonPoints(raw: string): LonLat[] | null {
  const numbers = raw
    .trim()
    .split(/\s+/)
    .flatMap((token) => token.split(','))
    .map(Number)

  if (numbers.length < 6 || numbers.length % 2 !== 0 || numbers.some((n) => !Number.isFinite(n))) {
    return null
  }

  const points: LonLat[] = []
  for (let i = 0; i < numbers.length; i += 2) {
    // CAP is lat,lon — GeoJSON wants [lon, lat].
    points.push([numbers[i + 1], numbers[i]])
  }

  return points
}

// Splits a point list into one or more closed loops wherever a point
// exactly repeats its own loop's starting vertex — the signature left by
// two originally-separate polygons being concatenated without a
// separator. A normal, uncorrupted ring either never repeats a vertex
// (single loop, left as-is — Leaflet closes it implicitly) or only
// repeats its own first point at the very end (still a single loop).
function splitIntoClosedLoops(points: LonLat[]): LonLat[][] {
  const loops: LonLat[][] = []
  let loopStart = 0
  let i = loopStart + 1

  while (i < points.length) {
    const [lon, lat] = points[i]
    const [startLon, startLat] = points[loopStart]

    if (lon === startLon && lat === startLat) {
      loops.push(points.slice(loopStart, i + 1))
      loopStart = i + 1
      i = loopStart + 1
      continue
    }

    i++
  }

  if (loopStart < points.length - 1) {
    loops.push(points.slice(loopStart))
  }

  return loops.filter((loop) => loop.length >= 4)
}

function repairAvisoGeometry(feature: AvisoFeature): AvisoFeature {
  const polygonText = feature.properties?.polygon
  if (typeof polygonText !== 'string' || !polygonText.trim()) return feature

  const points = parseCapPolygonPoints(polygonText)
  if (!points) return feature

  const loops = splitIntoClosedLoops(points)
  if (loops.length === 0) return feature

  const geometry =
    loops.length === 1
      ? { type: 'Polygon', coordinates: [loops[0]] }
      : { type: 'MultiPolygon', coordinates: loops.map((loop) => [loop]) }

  return { ...feature, geometry }
}

export function useAvisosLayers(map: L.Map) {
  const avisosStore = useAvisosStore()

  let avisosLayer: L.FeatureGroup | null = null
  let lastFeatureInteractionAt = 0

  const AVISO_WEIGHT = 2
  const SELECTED_AVISO_WEIGHT = 4
  // Blue contrasts against all four level colors (verde/amarillo/naranja/
  // rojo) — picking a selected aviso used to recolor it to the same red as
  // "rojo" severity, making a selected rojo zone indistinguishable from an
  // unselected one.
  const SELECTED_AVISO_COLOR = '#1d4ed8'

  function escapeHtml(value: unknown): string {
    return String(value ?? '-')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  function getLevelBadge(level: string): string {
    const normalizedLevel = level.toLowerCase()

    if (normalizedLevel === 'rojo') {
      return '<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#ef4444;color:#fff;font-weight:700">Rojo</span>'
    }

    if (normalizedLevel === 'naranja') {
      return '<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#f97316;color:#fff;font-weight:700">Naranja</span>'
    }

    if (normalizedLevel === 'amarillo') {
      return '<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#fde047;color:#1f2937;font-weight:700">Amarillo</span>'
    }

    if (normalizedLevel === 'verde') {
      return '<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#4ade80;color:#14532d;font-weight:700">Verde</span>'
    }

    return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#e5e7eb;color:#374151;font-weight:700">${escapeHtml(level || 'N/A')}</span>`
  }

  // Rain avisos carry their headline accumulated-precip figure only inside
  // the free-text `description` (e.g. "Precipitación acumulada en 12
  // horas: 40 mm. Durante el episodio..."), not as its own property — pull
  // just that lead figure out so the popup can show it as a short "Precip
  // Acum 12hs: 40mm" line instead of the whole paragraph.
  function extractAccumulatedPrecipLabel(description: string): string | null {
    // Some upstream feeds serialize accented characters in NFD (decomposed:
    // "o" + a separate combining accent mark) instead of NFC (precomposed
    // "ó") — invisible everywhere the text is displayed or pasted, but it
    // silently breaks a character class like [oó], which only matches the
    // precomposed form. Normalizing first makes the match independent of
    // whichever form the source happened to use.
    // AEMET writes a single hour as the word "una" instead of the digit
    // "1" (e.g. "acumulada en una hora: 15 mm"), unlike every other count
    // ("12 horas", "24 horas"...) — a plain \d+ never matches "una", which
    // is why some rain avisos' popups showed the figure and others didn't.
    const normalized = description.normalize('NFC')
    const match = normalized.match(
      /Precipitaci[oó]n acumulada en (?:(\d+)|una)\s*horas?:\s*([\d.,]+)\s*mm/i
    )
    if (!match) return null

    const hours = match[1] ?? '1'
    const value = match[2].replace(',', '.')
    return `Precip Acum ${hours}hs: ${value}mm`
  }

  // Wind avisos carry their headline gust figure the same way rain avisos
  // carry accumulated precip — only inside the free-text `description`
  // (e.g. "Rachas máximas: 80 km/h."), never as its own property.
  function extractWindGustLabel(description: string): string | null {
    const normalized = description.normalize('NFC')
    const match = normalized.match(/Rachas?\s*m[aá]ximas?:\s*([\d.,]+)\s*km\/h/i)
    if (!match) return null

    const value = match[1].replace(',', '.')
    return `Racha Máx: ${value}km/h`
  }

  function buildAvisoTooltipContent(props: Record<string, unknown>): string {
    const areaDesc = escapeHtml(props.areaDesc ?? '-')
    const level = String(props.level ?? 'N/A')
    const severityTranslations: Record<string, string> = {
      extreme: 'Extremo',
      severe: 'Severo',
      moderate: 'Moderado',
      minor: 'Menor',
    }
    const rawSeverity = String(props.severity ?? '')
    const severity = escapeHtml(
      (severityTranslations[rawSeverity.toLowerCase()] ?? rawSeverity) || '-'
    )
    const effective = String(props.effective ?? '')
    const expires = String(props.expires ?? '')

    const effectiveDate = effective ? new Date(effective).toLocaleString('es-ES') : '-'
    const expiresDate = expires ? new Date(expires).toLocaleString('es-ES') : '-'
    const levelBadge = getLevelBadge(level)

    const description = String(props.description ?? '')
    const accumulatedPrecipLabel = extractAccumulatedPrecipLabel(description)
    const windGustLabel = extractWindGustLabel(description)
    const accumulatedPrecipSection = accumulatedPrecipLabel
      ? `<div style="margin-bottom:4px"><strong>${escapeHtml(accumulatedPrecipLabel)}</strong></div>`
      : ''
    const windGustSection = windGustLabel
      ? `<div style="margin-bottom:4px"><strong>${escapeHtml(windGustLabel)}</strong></div>`
      : ''

    return `
      <div style="position:relative;display:inline-block;width:max-content;max-width:calc(100vw - 48px);padding-bottom:10px;font-family:Montserrat,sans-serif;white-space:normal;">
        <div style="border-radius:12px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.16)">
          <div style="padding:10px 12px;background:linear-gradient(135deg, #0f4c81 0%, #0b365c 100%);color:#fff">
            <div style="font-size:14px;font-weight:700;line-height:1.25">${areaDesc}</div>
          </div>
          <div style="padding:10px 12px;background:#fff;color:#1f2937;font-size:12px;line-height:1.45">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
              <strong>Nivel</strong>
              ${levelBadge}
            </div>
            <div style="margin-bottom:4px"><strong>Severidad:</strong> ${severity}</div>
            ${accumulatedPrecipSection}
            ${windGustSection}
            <div style="margin-bottom:4px"><strong>Desde:</strong> ${escapeHtml(effectiveDate)}</div>
            <div><strong>Hasta:</strong> ${escapeHtml(expiresDate)}</div>
          </div>
        </div>
        <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:10px solid #ffffff;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.12));">
        </div>
      </div>
    `
  }

  const createGeoJSONStyle = (properties: Record<string, unknown>, isSelected: boolean) => {
    const levelColor = getLevelColor(String(properties.level ?? ''))

    return {
      color: isSelected ? SELECTED_AVISO_COLOR : levelColor,
      weight: isSelected ? SELECTED_AVISO_WEIGHT : AVISO_WEIGHT,
      opacity: isSelected ? 1 : 0.8,
      fillOpacity: 0.2,
      fillColor: levelColor,
    }
  }

  const getLevelColor = (level: string): string => {
    const colorMap: Record<string, string> = {
      verde: '#00AA00',
      amarillo: '#FFFF00',
      naranja: '#FFA500',
      rojo: '#FF0000',
    }
    return colorMap[level?.toLowerCase()] || '#FFA500'
  }

  // AEMET frequently issues separate features for the same zone at
  // different severity levels with overlapping validity windows — drawing
  // every one of them means a lower-severity polygon can sit right next to
  // (or peek out from under) the higher one for the same zone. Only the
  // single highest-severity feature per zone should ever reach the map.
  const LEVEL_SEVERITY: Record<string, number> = {
    verde: 0,
    amarillo: 1,
    naranja: 2,
    rojo: 3,
  }

  const getLevelSeverity = (level: string): number => LEVEL_SEVERITY[level?.toLowerCase()] ?? 0

  const getAvisoFeatureId = (properties: Record<string, unknown>): string | null => {
    const areaDesc = String(properties.areaDesc ?? '').trim()
    return areaDesc || null
  }

  // Keeps, per zone (areaDesc, falling back to identifier when absent), only
  // the feature with the highest active severity — the rest are discarded
  // rather than merely drawn underneath, so there's never more than one
  // polygon per zone on the map.
  const pickTopSeverityPerZone = (features: AvisoFeature[]): AvisoFeature[] => {
    const byZone = new Map<string, AvisoFeature>()
    let unkeyedIndex = 0

    for (const feature of features) {
      const properties = (feature.properties || {}) as Record<string, unknown>
      const zoneKey = getAvisoFeatureId(properties) ?? String(properties.identifier ?? '')
      const key = zoneKey || `__unkeyed-${unkeyedIndex++}`

      const current = byZone.get(key)
      if (!current) {
        byZone.set(key, feature)
        continue
      }

      const currentProps = current.properties as Record<string, unknown>
      const currentLevel = String(currentProps?.level ?? '')
      const nextLevel = String(properties.level ?? '')
      const currentSeverity = getLevelSeverity(currentLevel)
      const nextSeverity = getLevelSeverity(nextLevel)

      if (nextSeverity > currentSeverity) {
        byZone.set(key, feature)
        continue
      }

      // Same severity for the same zone (e.g. two overlapping "amarillo"
      // CAP entries) — prefer the more recently issued one rather than
      // whichever happened to come first in the API response, so the
      // feature actually shown is the current one, not a stale duplicate.
      if (nextSeverity === currentSeverity) {
        const currentEffective = Date.parse(String(currentProps?.effective ?? ''))
        const nextEffective = Date.parse(String(properties.effective ?? ''))

        if (
          Number.isFinite(nextEffective) &&
          (!Number.isFinite(currentEffective) || nextEffective > currentEffective)
        ) {
          byZone.set(key, feature)
        }
      }
    }

    return Array.from(byZone.values())
  }

  const isAvisoInInterval = (aviso: AvisoFeature): boolean => {
    try {
      // Si faltan fechas de vigencia, no se muestra
      if (!aviso.properties?.effective || !aviso.properties?.expires) {
        return false
      }

      const intervalStart = new Date(avisosStore.selectedIntervalStart).getTime()
      const intervalEnd = intervalStart + 6 * 60 * 60 * 1000 // 6 horas después

      const avisoEffective = new Date(String(aviso.properties.effective ?? '')).getTime()
      const avisoExpires = new Date(String(aviso.properties.expires ?? '')).getTime()

      if (!Number.isFinite(avisoEffective) || !Number.isFinite(avisoExpires)) {
        return false
      }

      // Solape estricto entre vigencia del aviso y el intervalo seleccionado
      return avisoEffective < intervalEnd && avisoExpires > intervalStart
    } catch (error) {
      console.warn('[useAvisosLayers] Error checking aviso interval:', error)
      return false
    }
  }

  const clearAvisoLayer = () => {
    if (avisosLayer) {
      map.removeLayer(avisosLayer)
      avisosLayer = null
    }
  }

  const addAvisoLayers = () => {
    clearAvisoLayer()

    if (!avisosStore.avisos || avisosStore.avisos.length === 0 || !avisosStore.selectedTipo) {
      console.log('[useAvisosLayers] No avisos to display', {
        hasAvisos: !!avisosStore.avisos,
        length: avisosStore.avisos?.length,
        selectedTipo: avisosStore.selectedTipo,
      })
      return
    }

    // Filtrar avisos que están en el intervalo de fecha seleccionado
    const avisosInInterval = avisosStore.avisos.filter((f) => {
      const isFeature = f.type === 'Feature'
      const isInInterval = isAvisoInInterval(f)

      if (!isFeature) {
        console.warn('[useAvisosLayers] Aviso is not a Feature:', f)
      }

      return isFeature && isInInterval
    })

    console.log('[useAvisosLayers] Filtered avisos:', {
      total: avisosStore.avisos.length,
      filtered: avisosInInterval.length,
      selectedTipo: avisosStore.selectedTipo,
      selectedInterval: avisosStore.selectedIntervalStart,
      avisosList: avisosInInterval.map((a) => ({
        identifier: a.properties?.identifier,
        headline: a.properties?.headline,
        effective: a.properties?.effective,
        expires: a.properties?.expires,
      })),
    })

    if (avisosInInterval.length === 0) {
      console.warn('[useAvisosLayers] No avisos passed the interval filter')
      return
    }

    const avisosRepaired = avisosInInterval.map(repairAvisoGeometry)
    const avisosTopSeverity = pickTopSeverityPerZone(avisosRepaired)

    // Adjacent zones share a border edge — Leaflet paints each feature's
    // stroke in array order, so whichever one comes last "wins" that shared
    // edge. Without this, the selected zone's blue outline could be partly
    // painted over by a neighboring (unselected) zone's own border,
    // leaving only part of its perimeter visibly highlighted.
    const avisosByDrawOrder = [...avisosTopSeverity].sort((a, b) => {
      const aIsSelected = getAvisoFeatureId(a.properties || {}) === avisosStore.selectedAvisoId
      const bIsSelected = getAvisoFeatureId(b.properties || {}) === avisosStore.selectedAvisoId
      return Number(aIsSelected) - Number(bIsSelected)
    })

    // Crear GeoJSON FeatureCollection con todos los avisos
    const featureCollection = {
      type: 'FeatureCollection' as const,
      features: avisosByDrawOrder,
    }

    // Crear una sola capa GeoJSON con todos los avisos
    avisosLayer = L.geoJSON(featureCollection, {
      pane: MAP_PANES.AVISOS,
      style: (feature) => {
        const properties = (feature?.properties || {}) as Record<string, unknown>
        const featureId = getAvisoFeatureId(properties)
        const isSelected = featureId !== null && featureId === avisosStore.selectedAvisoId
        return createGeoJSONStyle(properties, isSelected)
      },
      onEachFeature: (feature, layer) => {
        const props = (feature.properties || {}) as Record<string, unknown>
        const featureId = getAvisoFeatureId(props)
        const isSelected = featureId !== null && featureId === avisosStore.selectedAvisoId
        const baseStyle = createGeoJSONStyle(props, isSelected)
        const hoverStyle = {
          ...baseStyle,
          weight: baseStyle.weight + 1,
          fillOpacity: Math.min(baseStyle.fillOpacity + 0.12, 0.6),
          opacity: 1,
        }

        const tooltipContent = buildAvisoTooltipContent(props)

        if (layer instanceof L.Path) {
          layer.bindTooltip(tooltipContent, {
            permanent: false,
            sticky: true,
            direction: 'top',
            className: 'feature-hover-tooltip',
            offset: L.point(0, -8),
            opacity: 1,
          })
        }

        if (layer instanceof L.Path) {
          layer.on('mouseover', () => {
            layer.setStyle(hoverStyle)
            if (layer.getTooltip()) {
              layer.openTooltip()
            }
          })

          layer.on('mouseout', () => {
            layer.setStyle(baseStyle)
            if (layer.getTooltip()) {
              layer.closeTooltip()
            }
          })
        }

        layer.on('click', () => {
          lastFeatureInteractionAt = Date.now()
          console.log('[useAvisosLayers] Aviso clicked:', featureId)
          if (!featureId) return
          avisosStore.selectAvisoFeature(featureId)

          if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
            const bounds = layer.getBounds()
            if (bounds.isValid()) {
              map.fitBounds(bounds, {
                padding: [40, 40],
                animate: true,
                duration: 0.8,
              })
            }
          }
        })

        if (layer instanceof L.Path) {
          layer.on('dblclick', (e: L.LeafletMouseEvent) => {
            lastFeatureInteractionAt = Date.now()
            L.DomEvent.stop(e)
            if (!featureId) return

            const queryObj = {
              ...router.currentRoute.value.query,
              aviso: featureId,
            }

            router.replace({ query: queryObj })
          })
        }
      },
    })

    console.log('[useAvisosLayers] Adding layer to map with', avisosInInterval.length, 'avisos')
    avisosLayer.addTo(map)
    console.log('[useAvisosLayers] Layer added successfully')
  }

  map.on('click', () => {
    // Ignorar el click de mapa que burbujea justo después de clicar una feature
    if (Date.now() - lastFeatureInteractionAt < 120) {
      return
    }

    if (avisosStore.selectedAvisoId) {
      avisosStore.clearSelectedAvisoFeature()
    }

    if (router.currentRoute.value.query.aviso) {
      const queryObj = { ...router.currentRoute.value.query }
      delete queryObj.aviso
      router.replace({ query: queryObj })
    }
  })

  // Watch de avisos, selectedAvisoId e intervalo de fecha
  watch(
    () => [avisosStore.avisos, avisosStore.selectedAvisoId, avisosStore.selectedIntervalStart],
    () => {
      console.log('[useAvisosLayers] Watch triggered')
      addAvisoLayers()
    },
    { deep: true }
  )

  // Limpiar al desmontar o cuando se vacían los avisos
  watch(
    () => avisosStore.selectedTipo,
    (newTipo) => {
      if (!newTipo) {
        console.log('[useAvisosLayers] Clearing avisos layer')
        clearAvisoLayer()
      }
    }
  )

  return {
    clearAvisoLayer,
    addAvisoLayers,
  }
}
