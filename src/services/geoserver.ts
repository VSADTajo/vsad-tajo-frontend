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
    zIndex: config.zIndex ?? 1,
  } as WMSOptionsExtended)
}

// ==============================
// 🟩 TMS
// ==============================

export function createTMSLayer(config: TMSLayerConfig): L.TileLayer {
  return L.tileLayer(config.url, {
    tms: true,
    opacity: config.opacity ?? 1,
    zIndex: config.zIndex ?? 1,
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
    // Asegurarnos que no haya ? en la URL base
    const baseUrl = config.url.split('?')[0]

    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.0.0',
      request: 'GetFeature',
      typeName: config.typeName,
      outputFormat: 'application/json',
      srsName: 'EPSG:4326',
      ...extraParams, // Aquí van filtros como CQL_FILTER
    })

    const finalUrl = `${baseUrl}?${params.toString()}`

    const response = await fetch(finalUrl)
    if (!response.ok) {
      console.error('Error WFS:', response.statusText, finalUrl)
      return null
    }

    const geojson = await response.json()

    return L.geoJSON(geojson, {
      style: config.style,
      pointToLayer: config.pointToLayer,
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

export async function getWFSFeature(
  config: WFSLayerConfig,
  filter: string
): Promise<GeoJSON.FeatureCollection | null> {
  const params = {
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typeName: config.typeName,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    CQL_FILTER: filter,
  }

  try {
    return await ky.get(config.url, { searchParams: params }).json<GeoJSON.FeatureCollection>()
  } catch (error) {
    console.error('WFS feature error', error)
    return null
  }
}
