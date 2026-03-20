import { ref } from 'vue'
import { baseLayersConfig } from '@/config/layers.config'
import { createLayer } from '@/services/geoserver'
import { boundaryStore } from '@/stores/boundaryStore'
import L from 'leaflet'

export function useBaseLayers(map: L.Map) {
  const leafletLayers = ref<Record<string, L.Layer>>({})

  async function initBaseLayers() {
    for (const config of baseLayersConfig) {
      const layer = await createLayer(config)

      if (layer) {
        leafletLayers.value[config.id] = layer
        layer.addTo(map) // siempre se añaden
      }

      if (config.id === 'contorno' && layer instanceof L.GeoJSON) {
        const bounds = layer.getBounds()

        const bbox: [[number, number], [number, number]] = [
          [bounds.getSouth(), bounds.getWest()],
          [bounds.getNorth(), bounds.getEast()],
        ]

        boundaryStore['contorno'] = {
          geojson: layer.toGeoJSON() as GeoJSON.FeatureCollection,
          bbox: bbox,
        }
      }
    }
  }

  return {
    initBaseLayers,
  }
}
