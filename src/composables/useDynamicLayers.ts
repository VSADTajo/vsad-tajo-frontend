// useDynamicLayers.ts
import { watch } from 'vue'
import { useLayersStore } from '@/stores/layersStore'
import { MapLayerManager } from '@/mapManager/MapLayerManager'
import L from 'leaflet'

export function useDynamicLayers(map: L.Map) {
  const store = useLayersStore()
  const manager = new MapLayerManager(map)

  watch(
    () => store.layers,
    (layersState) => {
      manager.sync(layersState)
    },
    { deep: true, immediate: true }
  )
}
