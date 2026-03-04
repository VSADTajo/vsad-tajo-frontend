import { ref } from 'vue'
import { baseLayersConfig } from '@/config/layers.config'
import { createLayer } from '@/services/geoserver'

export function useBaseLayers(map: L.Map) {
  const leafletLayers = ref<Record<string, L.Layer>>({})

  async function initBaseLayers() {
    for (const config of baseLayersConfig) {
      const layer = await createLayer(config)

      if (layer) {
        leafletLayers.value[config.id] = layer
        layer.addTo(map) // siempre se añaden
      }
    }
  }

  return {
    initBaseLayers,
  }
}
