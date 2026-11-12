import { efas_token, efas_url } from '@/config/efasConfig'
import ky from 'ky'
import L from 'leaflet'

export interface WmsLayerTime {
  layerName: string
  start: string
  end: string
  stepHours: number
}

let cachedCapabilities: Document | null = null
let cachedAt = 0

// EFAS's time dimension end advances continuously as new forecast runs
// land (every few hours) — caching this document forever (as before) meant
// a long-lived browser tab/dev session kept using whatever "end" was true
// weeks ago, which then made loadTemporalDimension's safety clamp (in
// TemporalLayerManager.ts) think any genuinely current start date was
// "in the future" relative to that stale end, snapping it back to ~5 days
// before the stale end instead. A short TTL keeps this cheap (no refetch
// per layer activation) while still catching up within a few minutes.
const CAPABILITIES_CACHE_TTL_MS = 5 * 60 * 1000

async function getEFASCapabilities(): Promise<Document> {
  const ageMs = Date.now() - cachedAt
  const isFresh = cachedCapabilities && ageMs < CAPABILITIES_CACHE_TTL_MS

  if (isFresh) return cachedCapabilities as Document

  // The browser's own HTTP cache can silently serve a response to this
  // exact URL+query from weeks ago (a long-lived tab/session never
  // refetches it), completely invisible to the TTL cache above — that
  // cache only guards how often *we* ask, not what the browser hands back
  // when we do. `cache: 'no-store'` forces every call to actually hit the
  // network, so our own TTL is the only caching layer in play.
  // EFAS serves a different (and apparently stale) GetCapabilities document
  // to unauthenticated requests than it does once a token is attached — the
  // "end" of each layer's time dimension only reflects the current forecast
  // run when the token is present.
  const xmlText = await ky
    .get(efas_url, {
      searchParams: {
        service: 'WMS',
        request: 'GetCapabilities',
        token: efas_token,
      },
      cache: 'no-store',
    })
    .text()

  const parser = new DOMParser()

  cachedCapabilities = parser.parseFromString(xmlText, 'text/xml')
  cachedAt = Date.now()

  return cachedCapabilities
}

export async function getLayerTimeDimension(layerName: string): Promise<WmsLayerTime | null> {
  const xml = await getEFASCapabilities()

  const layers = xml.querySelectorAll('Layer')

  for (const layer of layers) {
    const name = layer.querySelector('Name')?.textContent

    if (name === layerName) {
      const dim = layer.querySelector('Dimension[name="time"]')

      if (!dim) return null

      const text = dim.textContent ?? ''

      const [start, end, step] = text.split('/')

      const stepHours = Number(step.replace('PT', '').replace('H', ''))

      return {
        layerName,
        start,
        end,
        stepHours,
      }
    }
  }

  return null
}

export function getLayerLegendUrl(layerName: string): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetLegendGraphic',
    LAYER: layerName,
    TOKEN: efas_token,
    FORMAT: 'image/png',
  })

  return `${efas_url}?${params.toString()}`
}

// Helper para construir la URL GetFeatureInfo
export function buildFeatureInfoUrl(map: L.Map, layer: L.TileLayer.WMS, latlng: L.LatLng): string {
  const point = map.latLngToContainerPoint(latlng)
  const size = map.getSize()

  const bounds = map.getBounds()

  const bbox = [
    bounds.getSouthWest().lat,
    bounds.getSouthWest().lng,
    bounds.getNorthEast().lat,
    bounds.getNorthEast().lng,
  ].join(',')

  const params = {
    request: 'GetFeatureInfo',
    service: 'WMS',
    version: '1.3.0',
    crs: 'EPSG:4326',
    layers: 'mapserver:ReportingPoints',
    query_layers: 'mapserver:ReportingPoints',
    info_format: 'text/html',
    i: String(Math.floor(point.x)),
    j: String(Math.floor(point.y)),
    width: String(size.x),
    height: String(size.y),
    bbox,
    styles: '',
    format: 'image/png',
    token: efas_token,
  }

  return efas_url + '?' + new URLSearchParams(params)
}
