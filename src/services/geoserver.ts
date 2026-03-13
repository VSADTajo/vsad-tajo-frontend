import L from 'leaflet'
import type { LayerConfig, WFSLayerConfig, WMSLayerConfig, TMSLayerConfig } from '@/types/Layers'
import ky from 'ky'

interface WMSOptionsExtended extends L.WMSOptions {
  tiled?: boolean
}

// ==============================
// 🟦 WMS
// ==============================

export function createWMSLayer(config: WMSLayerConfig): L.TileLayer.WMS {
  return L.tileLayer.wms(config.url, {
    layers: config.layers,
    format: 'image/png',
    transparent: true,
    tiled: true,
    opacity: config.opacity ?? 1,
    pane: config.pane,
  } as WMSOptionsExtended)
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
      ...extraParams,
    }

    const geojson = await ky.get(baseUrl, { searchParams: params }).json()

    return L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
      style: config.style,
      pointToLayer: config.pointToLayer,
      pane: config.pane,
    })
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
  WMS: (config) => createWMSLayer(config as WMSLayerConfig),
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
  fid: string
): Promise<GeoJSON.Feature | null> {
  const params = {
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typeName: config.typeName,
    outputFormat: 'application/json',
    featureID: fid,
  }

  const fc = await ky.get(config.url, { searchParams: params }).json<GeoJSON.FeatureCollection>()

  return fc.features?.[0] ?? null
}
