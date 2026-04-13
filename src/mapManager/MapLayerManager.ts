// MapLayerManager.ts
import L from 'leaflet'
import { dynamicLayersConfig } from '@/config/layers.config'
import { createLayer } from '@/services/geoserver'
import type { LayerConfig, LayerState, WMSLayerConfig } from '@/types/Layers'
import router from '@/router'
import {
  buildFeatureInfoUrl,
  getLayerLegendUrl,
  getLayerTimeDimension,
} from '@/services/efasWmsService'
import { LegendManager } from './LegendManager'
import { useLayersStore } from '@/stores/layersStore'
import { subHours, isAfter, parseISO } from 'date-fns'
import { useReportingPointStore } from '@/stores/reportingPointsStore'
import { MAP_PANES } from '@/config/panes/mapPanes'

export class MapLayerManager {
  private map: L.Map
  private legendManager: LegendManager
  private activeLayers: Record<string, L.Layer> = {}
  private cache: Record<string, L.Layer> = {}
  private configMap = new Map(dynamicLayersConfig.map((c) => [c.id, c]))
  private styleManagers: Record<
    string,
    { clearAll: () => void; wasLastClickHandled: () => boolean }
  > = {}
  private mapClickDebounce: ReturnType<typeof setTimeout> | null = null

  constructor(map: L.Map) {
    this.map = map
    this.legendManager = new LegendManager(map)

    // Listener para click fuera de features → deseleccionar
    this.map.on('click', () => {
      // Pequeño delay para dar tiempo a que el StyleManager registre el click en la feature
      if (this.mapClickDebounce) clearTimeout(this.mapClickDebounce)
      this.mapClickDebounce = setTimeout(() => {
        let anyHandled = false

        for (const sm of Object.values(this.styleManagers)) {
          if (sm && typeof sm === 'object' && 'wasLastClickHandled' in sm) {
            if (sm.wasLastClickHandled()) {
              anyHandled = true
            }
          }
        }

        if (!anyHandled) {
          console.log(`[MapLayerManager] Click en mapa (fuera de features) → deseleccionando`)
          this.clearAllSelections()
        }
      }, 50)
    })
  }

  async sync(layersState: Record<string, LayerState>) {
    await this.handleGroupedLayers(layersState)
    await this.handleStandardLayers(layersState)

    this.normalizePaneOrder()
  }

  // ==============================
  // 🟦 Capas Agrupadas
  // ==============================

  private groupedLayers: Record<string, L.Layer> = {}
  private layerGeneration: Record<string, number> = {}

  private async handleGroupedLayers(layersState: Record<string, LayerState>) {
    for (const config of this.configMap.values()) {
      if (!config.groupBy) continue

      console.log(`[MapLayerManager] Procesando capa agrupada: ${config.id}`)

      const { field, parentLayer } = config.groupBy

      const activeChildren = Object.values(layersState)
        .filter((l) => l.parentLayer === parentLayer && l.visible)
        .map((l) => l.id)

      console.log(
        `[MapLayerManager]   → Field: ${field}, Parent: ${parentLayer}, Active children: ${activeChildren.join(',')}`
      )

      // Si no hay hijos activos → limpiar capa
      if (!activeChildren.length) {
        const existing = this.groupedLayers[config.id]
        if (existing) {
          console.log(`[MapLayerManager]   → Limpiando capa ${config.id}`)
          this.map.removeLayer(existing)
          delete this.groupedLayers[config.id]
        }
        continue
      }

      const cql = `${field} IN (${activeChildren.map((v) => `'${v}'`).join(',')})`

      console.log(`[MapLayerManager]   → Creando capa con CQL: ${cql}`)

      // Crear callback para capas agrupadas
      const callback = (feature: GeoJSON.Feature) => {
        console.log(`[MapLayerManager] Callback para capa agrupada ${config.id}`)
        this.handleFeatureClick(config.id, feature)
      }

      const newLayer = await createLayer(config, { CQL_FILTER: cql }, callback)

      if (!newLayer) {
        console.log(`[MapLayerManager]   ⚠️ createLayer retornó null`)
        continue
      }

      const existing = this.groupedLayers[config.id]

      if (!existing) {
        console.log(`[MapLayerManager]   → Nueva capa agrupada, adjuntando listeners`)
        newLayer.addTo(this.map)
        this.attachVectorClick(config.id, newLayer)
        this.groupedLayers[config.id] = newLayer
      } else {
        // Si es GeoJSON podemos actualizar datos
        if (existing instanceof L.GeoJSON && newLayer instanceof L.GeoJSON) {
          console.log(`[MapLayerManager]   → Actualizando datos de capa existente`)
          existing.clearLayers()
          existing.addData(newLayer.toGeoJSON())
          // Usar el StyleManager del newLayer para re-adjuntar listeners
          const newStyleManager = Object.getOwnPropertyDescriptor(newLayer, '_styleManager')?.value
          if (newStyleManager && typeof newStyleManager.attachStyleListeners === 'function') {
            console.log(`[MapLayerManager]   → Re-adjuntando StyleManager desde newLayer`)
            newStyleManager.attachStyleListeners(existing, this.map)
            this.styleManagers[config.id] = newStyleManager
          } else {
            this.attachVectorClick(config.id, existing)
          }
        } else {
          // Para otros tipos, recreamos
          console.log(`[MapLayerManager]   → Recreando capa (tipo diferente)`)
          this.map.removeLayer(existing)
          newLayer.addTo(this.map)
          this.attachVectorClick(config.id, newLayer)
          this.groupedLayers[config.id] = newLayer
        }
      }
    }
  }

  // ==============================
  // 🟩 Capas normales
  // ==============================

  private temporalLayers: Record<string, L.TileLayer.WMS[]> = {}

  private async handleStandardLayers(layersState: Record<string, LayerState>) {
    for (const layerState of Object.values(layersState)) {
      const isGroupedChild = Array.from(this.configMap.values()).some(
        (config) => config.groupBy && config.id === layerState.parentLayer
      )

      if (isGroupedChild) continue

      const config = this.configMap.get(layerState.id)
      if (!config) continue

      const existing = this.activeLayers[layerState.id]

      // Activar
      if (layerState.visible && !existing) {
        // Limpiar selecciones al cambiar entre capas seleccionables
        const selectableIds = ['subcuencas', 'sistemas10', 'zonasexpl']
        if (selectableIds.includes(layerState.id)) {
          this.clearAllSelections()
        }

        if (config.temporal) {
          await this.loadTemporalDimension(config)
        }

        const layerStateObj = layersState[layerState.id]

        // Si sigue sin time → NO crear capa
        const time = layerStateObj?.params?.time

        if (config.temporal && !time) {
          return
        }

        // Crear capa con callback de dblclick
        const layer =
          this.cache[layerState.id] ??
          (await this.createLayerWithCallback(config, time ? { time } : {}, layerState.id))

        if (!layer) continue

        layer.addTo(this.map)

        console.log(`[MapLayerManager] Adjuntando listeners para ${layerState.id}`)
        this.attachVectorClick(layerState.id, layer)
        this.attachWMSClick(layerState.id, layer)

        this.activeLayers[layerState.id] = layer
        this.cache[layerState.id] = layer

        if (
          layerState.id === 'subcuencas' ||
          layerState.id === 'sistemas10' ||
          layerState.id === 'zonasexpl'
        ) {
          const pane = this.map.getPane(MAP_PANES.CONTORNO)
          if (pane) {
            pane.style.display = 'none'
          }
        }

        if (config.type === 'WMS' && config.legend === 'efas') {
          const layerName = (config as WMSLayerConfig).layers

          const legendUrl = getLayerLegendUrl(layerName)

          this.legendManager.addLegend(config.id, legendUrl)
        }
      }

      // Desactivar
      if (!layerState.visible && existing) {
        // Limpiar StyleManager antes de desactivar
        this.clearStyleManager(layerState.id)
        delete this.styleManagers[layerState.id]

        this.layerGeneration[layerState.id]++

        this.map.removeLayer(existing)
        delete this.activeLayers[layerState.id]

        const temporals = this.temporalLayers[layerState.id]
        if (temporals) {
          temporals.forEach((l) => this.map.removeLayer(l))
          delete this.temporalLayers[layerState.id]
        }

        if (layerState.temporal) {
          layerState.temporal = undefined
        }

        if (layerState.params?.time) {
          delete layerState.params.time
        }

        this.legendManager.removeLegend(layerState.id)

        if (
          layerState.id === 'subcuencas' ||
          layerState.id === 'sistemas10' ||
          layerState.id === 'zonasexpl'
        ) {
          // Solo restaurar CONTORNO si NO queda activo ninguno del grupo
          const anyGroupActive = Object.values(layersState).some(
            (l) =>
              l.visible && (l.id === 'subcuencas' || l.id === 'sistemas10' || l.id === 'zonasexpl')
          )

          if (!anyGroupActive) {
            const pane = this.map.getPane(MAP_PANES.CONTORNO)
            if (pane) {
              pane.style.display = ''
            }
          }
        }
      }

      this.updateOpacityState(layerState)
      await this.updateTimeState(layerState)
    }
  }

  // ==============================
  // 🎨 Actualizar opacidad
  // ==============================

  private updateOpacityState(layerState: LayerState) {
    const layer = this.activeLayers[layerState.id]
    const config = this.configMap.get(layerState.id)

    if (!layer) return

    if (layer instanceof L.GeoJSON) {
      const baseOpacity = config?.type === 'WFS' ? (config.style?.normal.opacity ?? 1) : 1
      const baseFillOpacity = config?.type === 'WFS' ? (config.style?.normal.fillOpacity ?? 1) : 1

      layer.setStyle({
        opacity: baseOpacity * layerState.opacity,
        fillOpacity: baseFillOpacity * layerState.opacity,
      })
    }

    if (layer instanceof L.TileLayer) {
      layer.setOpacity(layerState.opacity)
    }
  }

  // ==============================
  // 🎨 Actualizar Tiempo
  // ==============================

  private async updateTimeState(layerState: LayerState) {
    if (!layerState.visible) return

    const current = this.activeLayers[layerState.id]

    if (!current) return
    if (!(current instanceof L.TileLayer.WMS)) return

    const newTime = layerState.params?.time
    if (!newTime) return

    const currentTime = (current.wmsParams as unknown as Record<string, unknown>)?.time

    if (currentTime === newTime) return

    if (!layerState.params?.time) return

    const config = this.configMap.get(layerState.id)
    if (!config) return

    const createdLayer = await createLayer(config, { time: layerState.params.time })

    if (!createdLayer) return
    if (!(createdLayer instanceof L.TileLayer.WMS)) return

    const newLayer = createdLayer

    newLayer.setOpacity(0)
    newLayer.addTo(this.map)

    // Guardamos layers temporales
    if (!this.temporalLayers[layerState.id]) {
      this.temporalLayers[layerState.id] = []
    }

    const layers = this.temporalLayers[layerState.id]

    layers.push(newLayer)

    // mantener solo 2 layers (actual + anterior)
    if (layers.length > 2) {
      const old = layers.shift()
      if (old) this.map.removeLayer(old)
    }

    const gen = (this.layerGeneration[layerState.id] ?? 0) + 1
    this.layerGeneration[layerState.id] = gen

    newLayer.once('load', () => {
      //si la capa ya no es válida → salir
      if (this.layerGeneration[layerState.id] !== gen) {
        this.map.removeLayer(newLayer)
        return
      }

      if (!layerState.visible) {
        this.map.removeLayer(newLayer)
        return
      }

      // Fade in
      this.fadeLayer(newLayer, 1)

      // Fade out anterior
      this.fadeLayer(current, 0, () => {
        this.map.removeLayer(current)
      })

      this.activeLayers[layerState.id] = newLayer
    })
  }

  private fadeLayer(layer: L.TileLayer, targetOpacity: number, onEnd?: () => void) {
    let opacity = layer.options.opacity ?? 1
    const step = targetOpacity > opacity ? 0.1 : -0.1

    const interval = setInterval(() => {
      opacity += step
      layer.setOpacity(opacity)

      if ((step > 0 && opacity >= targetOpacity) || (step < 0 && opacity <= targetOpacity)) {
        layer.setOpacity(targetOpacity)
        clearInterval(interval)
        onEnd?.()
      }
    }, 50)
  }

  private attachWMSClick(layerId: string, layer: L.Layer) {
    if (!(layer instanceof L.TileLayer.WMS)) return

    this.map.on('click', async (e: L.LeafletMouseEvent) => {
      const url = buildFeatureInfoUrl(this.map, layer, e.latlng)

      try {
        const res = await fetch(url)
        const data = await res.text()

        if (!data) return

        this.handleWMSClick(layerId, data)
      } catch (err) {
        console.error(err)
      }
    })
  }

  private extractStationId(html: string): string | null {
    const doc = new DOMParser().parseFromString(html, 'text/html')

    const cell = doc.querySelector('#point-information tbody tr td')

    return cell?.textContent?.trim() ?? null
  }

  private handleWMSClick(layerId: string, data: string) {
    const stationId = this.extractStationId(data)

    if (!stationId) return

    switch (layerId) {
      case 'reportingpoints': {
        const reportingPointStore = useReportingPointStore()

        reportingPointStore.setReportingPoint({
          stationId: layerId,
          html: data,
        })

        router.replace({
          query: {
            ...router.currentRoute.value.query,
            reportingPoint: stationId,
          },
        })
        break
      }
    }
  }

  private attachVectorClick(layerId: string, layer: L.Layer) {
    console.log(`[MapLayerManager] attachVectorClick: ${layerId}`)

    if (!(layer instanceof L.GeoJSON)) {
      console.log(`[MapLayerManager]   ⚠️ No es L.GeoJSON, saltando`)
      return
    }

    // Si tiene StyleManager, usarlo
    const styleManager = Object.getOwnPropertyDescriptor(layer, '_styleManager')?.value as
      | {
          attachStyleListeners: (layer: L.GeoJSON, map: L.Map) => void
          clearAll: () => void
          wasLastClickHandled: () => boolean
        }
      | undefined

    if (
      styleManager &&
      typeof styleManager === 'object' &&
      'attachStyleListeners' in styleManager
    ) {
      console.log(`[MapLayerManager]   ✓ StyleManager encontrado para ${layerId}`)
      styleManager.attachStyleListeners(layer, this.map)

      // Guardar referencia para limpiar después
      this.styleManagers[layerId] = styleManager
      return
    }

    console.log(`[MapLayerManager]   ⚠️ No hay StyleManager para ${layerId}`)

    // Fallback: manejo de doble-click para navegación
    console.log(`[MapLayerManager] Usando fallback para ${layerId}`)
    const isSelectableLayer = ['subcuencas', 'sistemas10', 'zonasexpl'].includes(layerId)
    const eventType = isSelectableLayer ? 'dblclick' : 'click'

    const handler = (e: L.LeafletMouseEvent) => {
      console.log(
        `[MapLayerManager] Fallback handler: ${eventType} en ${layerId}, e.layer:`,
        e.layer
      )
      const geoJsonLayer = e.layer as unknown as L.GeoJSON
      const feature = geoJsonLayer.feature as GeoJSON.Feature | undefined
      if (!feature) {
        console.log(`[MapLayerManager]   ⚠️ Sin feature`)
        return
      }

      this.handleFeatureClick(layerId, feature)
    }

    layer.on(eventType, handler)
  }

  private handleFeatureClick(layerId: string, feature: GeoJSON.Feature) {
    console.log(`[MapLayerManager] handleFeatureClick: ${layerId}`)
    console.log(`[MapLayerManager]   → feature:`, feature.properties)

    switch (layerId) {
      case 'saih': {
        const stationCode = feature.properties?.codigo ? feature.properties.codigo : feature.id
        console.log(`[MapLayerManager]   → SAIH navegando a: ${stationCode}`)
        router.replace({
          query: {
            ...router.currentRoute.value.query,
            station: stationCode,
          },
        })
        break
      }

      case 'subcuencas': {
        const code = feature.properties?.code
        console.log(`[MapLayerManager]   → Subcuenca navegando a: ${code}`)
        router.replace({
          query: {
            ...router.currentRoute.value.query,
            subcuenca: code,
          },
        })
        break
      }

      case 'sistemas10': {
        const sistema = feature.properties?.sistema
        console.log(`[MapLayerManager]   → Sistema navegando a: ${sistema}`)
        router.replace({
          query: {
            ...router.currentRoute.value.query,
            sistema,
          },
        })
        break
      }

      case 'zonasexpl': {
        const zona = feature.properties?.ogc_fid
        console.log(`[MapLayerManager]   → Zona navegando a: ${zona}`)
        router.replace({
          query: {
            ...router.currentRoute.value.query,
            zona,
          },
        })
        break
      }

      default:
        console.log(`[MapLayerManager]   ⚠️ Capa ${layerId} sin comportamiento`)
    }
  }

  /**
   * Limpia el StyleManager de una capa específica
   */
  private clearStyleManager(layerId: string): void {
    const styleManager = this.styleManagers[layerId]

    if (styleManager && typeof styleManager === 'object' && 'clearAll' in styleManager) {
      console.log(`[MapLayerManager] Limpiando StyleManager de ${layerId}`)
      styleManager.clearAll()
    }
  }

  /**
   * Limpia TODOS los StyleManagers (click fuera)
   */
  private clearAllSelections(): void {
    console.log(`[MapLayerManager] Limpiando todas las selecciones`)

    // 1. Limpiar desde los styleManagers registrados
    for (const [layerId, styleManager] of Object.entries(this.styleManagers)) {
      if (styleManager && typeof styleManager === 'object' && 'clearAll' in styleManager) {
        console.log(`[MapLayerManager]   → Limpiando registrado: ${layerId}`)
        styleManager.clearAll()
      }
    }

    // 2. Fallback: buscar StyleManagers directamente en las capas activas
    const allLayers = { ...this.activeLayers, ...this.groupedLayers }
    for (const [layerId, layer] of Object.entries(allLayers)) {
      if (!(layer instanceof L.GeoJSON)) continue
      const sm = Object.getOwnPropertyDescriptor(layer, '_styleManager')?.value as
        | { clearAll: () => void }
        | undefined
      if (sm && typeof sm.clearAll === 'function') {
        console.log(`[MapLayerManager]   → Limpiando desde layer: ${layerId}`)
        sm.clearAll()
      }
    }

    // 3. Fallback duro: eliminar overlays huérfanos en el pane HIGHLIGHT
    const orphanHighlightLayers: L.Layer[] = []
    this.map.eachLayer((layer) => {
      if (!(layer instanceof L.GeoJSON)) return
      const pane = (layer.options as L.PathOptions & { pane?: string })?.pane
      if (pane === MAP_PANES.HIGHLIGHT) {
        orphanHighlightLayers.push(layer)
      }
    })

    for (const layer of orphanHighlightLayers) {
      console.log(`[MapLayerManager]   → Eliminando overlay huérfano en HIGHLIGHT pane`)
      this.map.removeLayer(layer)
    }
  }

  /**
   * Limpia StyleManagers de todas las capas excepto una
   */
  private clearOtherStyleManagers(layerId: string): void {
    const selectableLayers = ['subcuencas', 'sistemas10', 'zonasexpl']
    for (const otherId of selectableLayers) {
      if (otherId === layerId) continue
      this.clearStyleManager(otherId)
    }
  }

  /**
   * Envoltorio para createLayer que pasa el callback de dblclick
   */
  private async createLayerWithCallback(
    config: LayerConfig,
    extraParams: Record<string, string>,
    layerId: string
  ): Promise<L.Layer | null> {
    const callback = (feature: GeoJSON.Feature) => {
      this.handleFeatureClick(layerId, feature)
    }

    // Para capas WFS, pasamos el callback
    if (config.type === 'WFS') {
      return await createLayer(config, extraParams, callback)
    }

    // Para otras capas, creamos normal
    return await createLayer(config, extraParams)
  }

  private normalizePaneOrder() {
    Object.values(this.activeLayers).forEach((layer) => {
      if (layer instanceof L.GeoJSON) {
        layer.bringToBack()
      }
    })
  }

  private async loadTemporalDimension(config: LayerConfig) {
    try {
      if (config.type !== 'WMS') return

      const layersStore = useLayersStore()
      const layer = layersStore.layers[config.id]

      if (!layer) return
      if (layer.temporal) return

      const layerName = (config as WMSLayerConfig).layers
      const time = await getLayerTimeDimension(layerName)

      if (!time) return

      const startDate = config.start ? parseISO(config.start) : parseISO(time.start)
      const endDate = parseISO(time.end)

      const safeEnd = subHours(endDate, time.stepHours)

      // Si start está fuera (es mayor que end)
      const safeStart = isAfter(startDate, endDate)
        ? subHours(endDate, 10 * time.stepHours)
        : startDate

      layer.temporal = {
        start: safeStart.toISOString(),
        end: safeEnd.toISOString(),
        stepHours: time.stepHours,
      }

      layer.params = {
        ...layer.params,
        time: safeStart.toISOString(),
      }
    } catch (err) {
      console.error('Error loading temporal dimension', err)
    }
  }
}
