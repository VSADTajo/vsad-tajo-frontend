import L from 'leaflet'
import type { LayerConfig, WFSLayerConfig, WMSLayerConfig, TMSLayerConfig } from '@/types/Layers'
import ky from 'ky'
import { boundaryStore } from '@/stores/boundaryStore'
import { MAP_PANES } from '@/config/panes/mapPanes'
import { applyPolygonMaskToWMS, type LayerWithMap } from '@/utils/mask'

interface WMSOptionsExtended extends L.WMSOptions {
  tiled?: boolean
}

export function createWMSLayer(config: WMSLayerConfig, params?: Record<string, string>): L.Layer {
  const paneName = config.pane ?? 'overlayPane'
  let bounds: L.LatLngBounds | undefined

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
    ...params,
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
// 🟦 WFS (fetch + create)
// ==============================

export async function createWFSLayer(
  config: WFSLayerConfig,
  extraParams?: Record<string, string>
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

    const geojson = await ky.get(baseUrl, { searchParams: params }).json()

    let highlightLayer: L.GeoJSON | null = null

    const geojsonLayer = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
      style: config.style?.normal,
      pointToLayer: config.pointToLayer,
      pane: config.pane,
      interactive: config.interactive ?? true,

      onEachFeature: (feature, layer) => {
        if (!config.highlight || !config.style) return

        const { highlight } = config.style

        layer.on({
          mouseover: () => {
            // eliminar anterior
            if (highlightLayer) {
              highlightLayer.remove()
              highlightLayer = null
            }

            const map = (layer as LayerWithMap)._map
            if (!map) return

            // crear nuevo highlight en pane superior
            highlightLayer = L.geoJSON(feature as GeoJSON.GeoJsonObject, {
              style: highlight,
              pane: MAP_PANES.HIGHLIGHT,
              interactive: false,
            })

            highlightLayer.addTo(map)
          },

          mouseout: () => {
            if (highlightLayer) {
              highlightLayer.remove()
              highlightLayer = null
            }
          },
        })
      },
    })

    return geojsonLayer
  } catch (err) {
    console.error('Error creando capa WFS', err)
    return null
  }
}

// ==============================
// 🎯 Dispatcher (mantener compatibilidad)
// ==============================
type LayerFactory = (
  config: LayerConfig,
  extra?: Record<string, string>
) => Promise<L.Layer | null> | L.Layer | null

const layerFactories: {
  [K in LayerConfig['type']]: LayerFactory
} = {
  WMS: (config, extra) => createWMSLayer(config as WMSLayerConfig, extra),

  TMS: (config) => createTMSLayer(config as TMSLayerConfig),

  WFS: (config, extra) => createWFSLayer(config as WFSLayerConfig, extra),
}

export async function createLayer(
  config: LayerConfig,
  extraParams?: Record<string, string>
): Promise<L.Layer | null> {
  const factory = layerFactories[config.type]

  if (!factory) {
    console.warn(`No factory registered for type: ${config.type}`)
    return null
  }

  return await factory(config, extraParams)
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
