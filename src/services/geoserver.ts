import L from 'leaflet'
import type { LayerConfig, WFSLayerConfig, WMSLayerConfig, TMSLayerConfig } from '@/types/Layers'
import ky from 'ky'
import { boundaryStore } from '@/stores/boundaryStore'
import { applyPolygonMaskToWMS } from '@/utils/mask'
import { buildSaihPopupContent } from '@/utils/saihStations'
import {
  buildSubcuencaPopupContent,
  buildSistemaPopupContent,
  buildZonaPopupContent,
} from '@/utils/popupContent'
import { StyleManager } from '@/mapManager/StyleManager'

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

    console.log(`[GeoServer] Creando capa WFS: ${config.id}`)
    const geojson = await ky.get(baseUrl, { searchParams: params }).json()

    const geojsonLayer = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
      style: config.style?.normal,
      pointToLayer: config.pointToLayer,
      pane: config.pane,
      interactive: config.interactive ?? true,

      onEachFeature: (feature, layer) => {
        // Especial para SAIH: popups
        if (config.id === 'saih' && layer instanceof L.Marker) {
          layer.bindPopup(buildSaihPopupContent(feature), {
            closeButton: false,
            autoClose: false,
            closeOnClick: false,
            className: 'feature-hover-popup',
            offset: L.point(0, -14),
          })

          layer.on({
            mouseover: () => {
              layer.getElement()?.firstElementChild?.classList.add('is-highlight')
              layer.openPopup()
            },
            mouseout: () => {
              layer.getElement()?.firstElementChild?.classList.remove('is-highlight')
              layer.closePopup()
            },
          })
        }
      },
    })

    // Guardar StyleManager en el layer para acceso desde MapLayerManager
    const isSelectable = ['subcuencas', 'sistemas10', 'zonasexpl'].includes(config.id)

    // Seleccionar builder de popup según el layer
    let popupBuilder: ((feature: GeoJSON.Feature) => string) | undefined

    console.log('config.id en createWFSLayer:', config.id)

    if (config.id === 'subcuencas') {
      popupBuilder = buildSubcuencaPopupContent
    } else if (config.id === 'sistemas10') {
      popupBuilder = buildSistemaPopupContent
    } else if (config.id === 'zonasexpl') {
      popupBuilder = buildZonaPopupContent
    }

    const styleManager = new StyleManager(
      config.id,
      config.style,
      isSelectable,
      onDblClick,
      popupBuilder
    )

    console.log(
      `[GeoServer] Creando StyleManager para ${config.id}. isSelectable=${isSelectable}, hasCallback=${!!onDblClick}, hasPopup=${!!popupBuilder}`
    )

    Object.defineProperty(geojsonLayer, '_styleManager', {
      value: styleManager,
      writable: false,
      enumerable: false,
    })

    console.log(
      `[GeoServer] Capa WFS creada: ${config.id}. Features count: ${
        (geojson as GeoJSON.FeatureCollection).features?.length || 0
      }`
    )
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
