import { watch } from 'vue'
import L from 'leaflet'
import { useLocalFileStore } from '@/stores/localFileStore'
import { stationsToGeoJSON } from '@/utils/stationsToGeoJSON'
import { localFilePointStyle } from '@/config/styles/layerStyles'
import { MAP_PANES } from '@/config/panes/mapPanes'
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

  let layer: L.GeoJSON | null = null

  function clearLayer(): void {
    if (layer) {
      map.removeLayer(layer)
      layer = null
    }
  }

  function isActiveRoute(): boolean {
    return router.currentRoute.value.name === 'archivo-local'
  }

  function buildLayer(): void {
    clearLayer()

    if (!isActiveRoute() || localFileStore.stations.length === 0) return

    const geojson = stationsToGeoJSON(localFileStore.stations)

    layer = L.geoJSON(geojson, {
      pane: MAP_PANES.LOCAL_FILE,
      pointToLayer: localFilePointStyle,
      onEachFeature: (feature, featureLayer) => {
        if (!(featureLayer instanceof L.Marker)) return

        const stationCode = String(
          (feature.properties as Record<string, unknown>)?.stationCode ?? ''
        )

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
            featureLayer.getElement()?.firstElementChild?.classList.add('is-selected')
          },
          mouseout: () => {
            featureLayer.closePopup()
            featureLayer.getElement()?.firstElementChild?.classList.remove('is-selected')
          },
        })
      },
    })

    layer.addTo(map)

    const bounds = layer.getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 })
    }
  }

  watch(() => localFileStore.stations, buildLayer, { deep: true })
  watch(() => router.currentRoute.value.name, buildLayer)

  return {
    clearLayer,
    buildLayer,
  }
}
