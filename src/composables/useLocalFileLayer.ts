import { watch } from 'vue'
import L from 'leaflet'
import { useLocalFileStore } from '@/stores/localFileStore'
import { useLocalArealFileStore } from '@/stores/localArealFileStore'
import { useLayersStore } from '@/stores/layersStore'
import { stationsToGeoJSON } from '@/utils/stationsToGeoJSON'
import { saihPointStyle } from '@/config/styles/layerStyles'
import { registerSaihMarker, setSaihMarkerHighlight } from '@/utils/saihMarkersRegistry'
import router from '@/router'

function escapeHtml(value: unknown): string {
  return String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildPopupContent(feature: GeoJSON.Feature): string {
  const props = (feature.properties ?? {}) as Record<string, unknown>
  const codigo = escapeHtml(props.stationCode)
  const nombre = escapeHtml(props.name)

  return `
    <div style="min-width:160px;border-radius:12px;overflow:hidden;font-family:Montserrat,sans-serif;box-shadow:0 8px 20px rgba(0,0,0,0.16)">
      <div style="padding:8px 10px;background:#455a64;color:#fff">
        <div style="font-size:14px;font-weight:700;line-height:1.2">${codigo}</div>
        <div style="font-size:12px;opacity:.92;margin-top:2px;line-height:1.2">${nombre}</div>
      </div>
      <div style="padding:6px 10px;background:#fff;color:#1f2937;font-size:11px;">
        Estación cargada desde archivo local
      </div>
    </div>
  `
}

export function useLocalFileLayer(map: L.Map) {
  const localFileStore = useLocalFileStore()
  const arealFileStore = useLocalArealFileStore()
  const layersStore = useLayersStore()

  let layer: L.GeoJSON | null = null

  function clearLayer(): void {
    if (layer) {
      map.removeLayer(layer)
      layer = null
    }
  }

  function buildLayer(): void {
    clearLayer()

    // Loading *any* local file — even an areal-precipitation-only one with
    // no stations of its own — means "reading from file" mode: live SAIH
    // stations shouldn't clutter the map while the user is working offline.
    const isFileMode = localFileStore.stationsWithPredictions.length > 0 || arealFileStore.hasAreas

    if (!isFileMode) {
      layersStore.restoreStationLayersVisibility()
      return
    }

    layersStore.hideAllStationLayers()

    if (localFileStore.stationsWithPredictions.length === 0) return

    const geojson = stationsToGeoJSON(localFileStore.stationsWithPredictions)

    layer = L.geoJSON(geojson, {
      pointToLayer: saihPointStyle,
      onEachFeature: (feature, featureLayer) => {
        if (!(featureLayer instanceof L.Marker)) return

        const stationCode = String(
          (feature.properties as Record<string, unknown>)?.stationCode ?? ''
        )

        registerSaihMarker(stationCode, featureLayer)

        featureLayer.bindPopup(buildPopupContent(feature), {
          closeButton: false,
          autoClose: false,
          closeOnClick: false,
          className: 'feature-hover-popup',
          offset: L.point(0, -14),
        })

        featureLayer.on({
          click: () => {
            localFileStore.selectStation(stationCode)
            router.replace({
              query: { ...router.currentRoute.value.query, localStation: stationCode },
            })
          },
          mouseover: () => {
            featureLayer.openPopup()
            setSaihMarkerHighlight(stationCode)
          },
          mouseout: () => {
            featureLayer.closePopup()
            setSaihMarkerHighlight(null)
          },
        })
      },
    })

    layer.addTo(map)
  }

  watch(() => localFileStore.stationsWithPredictions, buildLayer, { deep: true })
  watch(() => arealFileStore.hasAreas, buildLayer)

  // Data can already be present (persisted from a previous session) at mount
  // time, in which case the watcher above never fires on its own — build once
  // eagerly so it isn't left blank.
  buildLayer()

  return {
    clearLayer,
    buildLayer,
  }
}
