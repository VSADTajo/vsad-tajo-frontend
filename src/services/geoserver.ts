import L from 'leaflet'
import type {
  LayerConfig,
  WFSLayerConfig,
  WMSLayerConfig,
  TMSLayerConfig,
  APIStationsLayerConfig,
  MeteoAccumulatedImageLayerConfig,
} from '@/types/Layers'
import ky from 'ky'
import { api } from './api'
import { boundaryStore } from '@/stores/boundaryStore'
import { applyPolygonMaskToWMS } from '@/utils/mask'
import { buildSaihPopupContent, buildSaihMinimalPopupContent } from '@/utils/saihStations'
import { registerSaihMarker } from '@/utils/saihMarkersRegistry'
import { useMapStore } from '@/stores/mapStore'
import { useSimulationsStore } from '@/stores/simulationsStore'
import { useMapModelStore } from '@/stores/mapModelStore'
import {
  buildMeteoalertaPopupContent,
  buildSubcuencaPopupContent,
  buildSistemaPopupContent,
  buildZonaPopupContent,
} from '@/utils/popupContent'
import { StyleManager } from '@/mapManager/StyleManager'
import { stationsToGeoJSON } from '@/utils/stationsToGeoJSON'
import type { StationsApiResponse } from '@/utils/stationsToGeoJSON'
import { buildMeteoAccumulatedMapUrl, getMeteoLayerTimeDimension } from '@/services/meteoService'

interface WMSOptionsExtended extends L.WMSOptions {
  tiled?: boolean
}

function normalizeIsoForWms(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function toRangeParams(timeValue: string): { from: string; to: string } | null {
  const [fromRaw, toRaw] = timeValue.split('/')
  if (!fromRaw || !toRaw) return null

  return {
    from: normalizeIsoForWms(fromRaw),
    to: normalizeIsoForWms(toRaw),
  }
}

function parseInCqlFilter(filter: string): { field: string; values: string[] } | null {
  const match = filter.match(/^\s*([A-Za-z_][\w]*)\s+IN\s*\((.*)\)\s*$/i)
  if (!match) return null

  const [, field, rawValues] = match
  const values = rawValues
    .split(',')
    .map((value) =>
      value
        .trim()
        .replace(/^'+|'+$/g, '')
        .replace(/^"+|"+$/g, '')
    )
    .filter(Boolean)

  if (!values.length) return null

  return { field, values }
}

function applyStationsCqlFilter(
  items: StationsApiResponse['items'],
  cqlFilter?: string
): StationsApiResponse['items'] {
  if (!cqlFilter) return items

  const parsedFilter = parseInCqlFilter(cqlFilter)
  if (!parsedFilter) return items

  const allowedValues = new Set(parsedFilter.values.map((value) => value.toUpperCase()))

  return items.filter((station) => {
    const stationValue = String(station[parsedFilter.field] ?? '').toUpperCase()
    return allowedValues.has(stationValue)
  })
}

// "Caudal NAM"/"Caudal MIKE" each only exist for a subset of stations —
// hasCaudalNam/hasCaudalMike (from GET /stations) say which. "caudal" is
// Observado's generic button covering both models at once, so it shows a
// station if either flag is true. "precipitacion" has no equivalent
// per-model flag, so it shows every station that already passed the type
// (CQL) filter.
function applyModelAvailabilityFilter(
  items: StationsApiResponse['items'],
  model: string
): StationsApiResponse['items'] {
  if (model === 'nam') return items.filter((station) => station.hasCaudalNam === true)
  if (model === 'mike11') return items.filter((station) => station.hasCaudalMike === true)
  if (model === 'caudal') {
    return items.filter(
      (station) => station.hasCaudalNam === true || station.hasCaudalMike === true
    )
  }
  return items
}

export function createWMSLayer(config: WMSLayerConfig, params?: Record<string, string>): L.Layer {
  const paneName = config.pane ?? 'overlayPane'
  let bounds: L.LatLngBounds | undefined

  const wmsParams = { ...(params ?? {}) }

  if (config.temporalControlMode === 'range') {
    const rangeFromTime = wmsParams.time ? toRangeParams(wmsParams.time) : null

    if (rangeFromTime) {
      wmsParams.from = rangeFromTime.from
      wmsParams.to = rangeFromTime.to
      delete wmsParams.time
    } else {
      if (wmsParams.from) wmsParams.from = normalizeIsoForWms(wmsParams.from)
      if (wmsParams.to) wmsParams.to = normalizeIsoForWms(wmsParams.to)
      delete wmsParams.time
    }
  }

  if (config.bbox) {
    bounds = L.latLngBounds(config.bbox)
  } else if (config.mask && boundaryStore[config.mask]) {
    bounds = L.latLngBounds(boundaryStore[config.mask].bbox)
  }

  const wms = L.tileLayer.wms(config.url, {
    layers: config.layers,
    format: 'image/png',
    transparent: true,
    tiled: true,
    opacity: config.opacity ?? 1,
    pane: paneName,
    bounds,
    updateWhenZooming: false,
    updateWhenIdle: true,
    keepBuffer: 2,
    ...wmsParams,
  } as WMSOptionsExtended)

  if (config.mask) {
    applyPolygonMaskToWMS(wms, config.mask)
  }

  return wms
}

// ==============================
// 🟩 TMS
// ==============================

export function createTMSLayer(config: TMSLayerConfig): L.TileLayer {
  return L.tileLayer(config.url, {
    tms: true,
    opacity: config.opacity ?? 1,
    pane: config.pane,
  })
}

// ==============================
// � API_STATIONS (fetch + convert)
// ==============================

export async function createAPIStationsLayer(
  config: APIStationsLayerConfig,
  extraParams?: Record<string, string>,
  onDblClick?: (feature: GeoJSON.Feature) => void
): Promise<L.GeoJSON | null> {
  try {
    const response = await api.get(config.url, { timeout: false }).json<StationsApiResponse>()

    const filteredItems = applyStationsCqlFilter(response.items, extraParams?.CQL_FILTER)
    const availableItems = applyModelAvailabilityFilter(
      filteredItems,
      useMapModelStore().selectedModel
    )

    const geojson = stationsToGeoJSON(availableItems)

    const geojsonLayer = L.geoJSON(geojson, {
      pointToLayer: config.pointToLayer,
      pane: config.pane,
      interactive: config.interactive ?? true,

      onEachFeature: (feature, layer) => {
        if (layer instanceof L.Marker) {
          const stationCode = String(
            (feature.properties as Record<string, unknown>)?.stationCode ?? ''
          )

          registerSaihMarker(stationCode, layer)

          layer.bindPopup(buildSaihPopupContent(feature), {
            closeButton: false,
            autoClose: false,
            closeOnClick: false,
            className: 'feature-hover-popup',
            offset: L.point(0, -14),
          })

          const getPopupContent = () =>
            useSimulationsStore().panelActive
              ? buildSaihMinimalPopupContent(feature)
              : buildSaihPopupContent(feature)

          layer.on({
            click: () => {
              const simStore = useSimulationsStore()
              if (simStore.panelActive && !simStore.isSimulationActive) return
              layer.setPopupContent(getPopupContent())
              layer.openPopup()
            },
            mouseover: () => {
              layer.setPopupContent(getPopupContent())
              layer.getElement()?.firstElementChild?.classList.add('is-highlight')
              layer.openPopup()
              useMapStore().setHoveredStation(stationCode)
            },
            mouseout: () => {
              layer.getElement()?.firstElementChild?.classList.remove('is-highlight')
              layer.closePopup()
              useMapStore().setHoveredStation(null)
            },
          })
        }

        if (onDblClick) {
          layer.on('dblclick', () => {
            onDblClick(feature)
          })
        }
      },
    })

    return geojsonLayer
  } catch (error) {
    console.error('[createAPIStationsLayer] Error fetching stations from', config.url, error)
    return null
  }
}

export async function createMeteoAccumulatedImageLayer(
  config: MeteoAccumulatedImageLayerConfig,
  extraParams?: Record<string, string>
): Promise<L.ImageOverlay | null> {
  try {
    const dimension = await getMeteoLayerTimeDimension(config)
    if (!dimension) return null

    const extentDimension =
      config.extentProvider && config.extentVariable
        ? await getMeteoLayerTimeDimension({
            provider: config.extentProvider,
            variable: config.extentVariable,
            infoPath: config.infoPath,
          })
        : null

    let renderDimension = dimension

    if (extentDimension) {
      renderDimension = {
        ...dimension,
        bbox: extentDimension.bbox,
        width: extentDimension.width,
        height: extentDimension.height,
      }
    }

    const from = extraParams?.from ?? dimension.start
    const to = extraParams?.to ?? dimension.end

    const imageUrl = buildMeteoAccumulatedMapUrl(config, renderDimension, { from, to })
    const token = localStorage.getItem('token')
    const imageBlob = await ky
      .get(imageUrl, {
        timeout: false,
        headers: {
          Accept: config.imageFormat ?? 'image/jpeg',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      .blob()

    const objectUrl = URL.createObjectURL(imageBlob)
    const bounds = L.latLngBounds(
      [renderDimension.bbox.minY, renderDimension.bbox.minX],
      [renderDimension.bbox.maxY, renderDimension.bbox.maxX]
    )

    const overlay = L.imageOverlay(objectUrl, bounds, {
      opacity: config.opacity ?? 1,
      pane: config.pane,
      interactive: config.interactive ?? false,
    }) as L.ImageOverlay & {
      __temporalSignature?: string
      __objectUrl?: string
    }

    overlay.__temporalSignature = `${from}/${to}`
    overlay.__objectUrl = objectUrl
    overlay.once('remove', () => {
      if (overlay.__objectUrl) {
        URL.revokeObjectURL(overlay.__objectUrl)
        overlay.__objectUrl = undefined
      }
    })

    return overlay
  } catch (error) {
    console.error('[createMeteoAccumulatedImageLayer] Error creating layer', config.id, error)
    return null
  }
}

// ==============================
// �🟦 WFS (fetch + create)
// ==============================

export async function createWFSLayer(
  config: WFSLayerConfig,
  extraParams?: Record<string, string>,
  onDblClick?: (feature: GeoJSON.Feature) => void
): Promise<L.GeoJSON | null> {
  try {
    const baseUrl = config.url.split('?')[0]

    const params = {
      service: 'WFS',
      version: '1.0.0',
      request: 'GetFeature',
      typeName: config.typeName,
      outputFormat: 'application/json',
      srsName: 'EPSG:4326',
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 2,
      ...extraParams,
    }

    const geojson = await ky.get(baseUrl, { searchParams: params, timeout: false }).json()

    const geojsonLayer = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
      style: config.style?.normal,
      pointToLayer: config.pointToLayer,
      pane: config.pane,
      interactive: config.interactive ?? true,

      onEachFeature: () => {},
    })

    // Guardar StyleManager en el layer para acceso desde MapLayerManager
    const isSelectable = ['subcuencas', 'sistemas10', 'zonasexpl', 'meteoalerta'].includes(
      config.id
    )

    // Seleccionar builder de popup según el layer
    let popupBuilder: ((feature: GeoJSON.Feature) => string) | undefined

    if (config.id === 'subcuencas') {
      popupBuilder = buildSubcuencaPopupContent
    } else if (config.id === 'sistemas10') {
      popupBuilder = buildSistemaPopupContent
    } else if (config.id === 'zonasexpl') {
      popupBuilder = buildZonaPopupContent
    } else if (config.id === 'meteoalerta') {
      popupBuilder = buildMeteoalertaPopupContent
    }

    const styleManager = new StyleManager(
      config.id,
      config.style,
      isSelectable,
      onDblClick,
      popupBuilder
    )

    Object.defineProperty(geojsonLayer, '_styleManager', {
      value: styleManager,
      writable: false,
      enumerable: false,
    })

    return geojsonLayer
  } catch (err) {
    console.error('[GeoServer] Error creando capa WFS', err)
    return null
  }
}

// ==============================
// 🎯 Dispatcher (mantener compatibilidad)
// ==============================
type LayerFactory = (
  config: LayerConfig,
  extra?: Record<string, string>,
  callback?: (feature: GeoJSON.Feature) => void
) => Promise<L.Layer | null> | L.Layer | null

const layerFactories: {
  [K in LayerConfig['type']]: LayerFactory
} = {
  WMS: (config, extra) => createWMSLayer(config as WMSLayerConfig, extra),

  TMS: (config) => createTMSLayer(config as TMSLayerConfig),

  WFS: (config, extra, callback) => createWFSLayer(config as WFSLayerConfig, extra, callback),

  API_STATIONS: (config, extra, callback) =>
    createAPIStationsLayer(config as APIStationsLayerConfig, extra, callback),

  METEO_ACCUMULATED_IMAGE: (config, extra) =>
    createMeteoAccumulatedImageLayer(config as MeteoAccumulatedImageLayerConfig, extra),
}

export async function createLayer(
  config: LayerConfig,
  extraParams?: Record<string, string>,
  onDblClick?: (feature: GeoJSON.Feature) => void
): Promise<L.Layer | null> {
  const factory = layerFactories[config.type]

  if (!factory) {
    console.warn(`No factory registered for type: ${config.type}`)
    return null
  }

  return await factory(config, extraParams, onDblClick)
}

export async function getWFSFeatureById(
  config: WFSLayerConfig,
  field: string,
  value: string | number
): Promise<GeoJSON.Feature | null> {
  const params = {
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typeName: config.typeName,
    outputFormat: 'application/json',
    CQL_FILTER: `${field}='${value}'`,
  }

  const fc = await ky.get(config.url, { searchParams: params }).json<GeoJSON.FeatureCollection>()

  return fc.features?.[0] ?? null
}

/**
 * Obtiene el feature (polígono) que contiene un punto dado
 */
export async function getFeatureContainingPoint(
  url: string,
  typeName: string,
  lat: number,
  lng: number,
  geomField = 'geom'
): Promise<GeoJSON.Feature | null> {
  try {
    const params = {
      service: 'WFS',
      version: '1.0.0',
      request: 'GetFeature',
      typeName,
      outputFormat: 'application/json',
      srsName: 'EPSG:4326',
      CQL_FILTER: `CONTAINS(${geomField}, POINT(${lng} ${lat}))`,
    }

    const response = await ky.get(url, { searchParams: params })
    const contentType = response.headers.get('content-type')

    const text = await response.text()

    if (contentType?.includes('xml')) {
      console.error('[getFeatureContainingPoint] GeoServer returned XML error:', text)
      return null
    }

    const fc = JSON.parse(text) as GeoJSON.FeatureCollection

    return fc.features?.[0] ?? null
  } catch (err) {
    console.error('[getFeatureContainingPoint] Error for', typeName, 'at', lat, lng, err)
    return null
  }
}
