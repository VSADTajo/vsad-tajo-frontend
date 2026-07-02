// useDynamicLayers.ts
import { watch } from 'vue'
import { useLayersStore } from '@/stores/layersStore'
import { useMapStore } from '@/stores/mapStore'
import { useMapDataSourceStore } from '@/stores/mapDataSourceStore'
import { useMapModelStore } from '@/stores/mapModelStore'
import { invalidateSaihAlertsCache } from '@/utils/saihAlerts'
import { MapLayerManager } from '@/mapManager/MapLayerManager'
import L from 'leaflet'

export function useDynamicLayers(map: L.Map) {
  const store = useLayersStore()
  const mapStore = useMapStore()
  const dataSourceStore = useMapDataSourceStore()
  const modelStore = useMapModelStore()
  const manager = new MapLayerManager(map)

  const applyPendingSelection = () => {
    const pendingSelection = mapStore.pendingFeatureSelection
    if (!pendingSelection) return false

    const selected = manager.selectFeature(pendingSelection.layerId, pendingSelection.featureId, {
      focus: pendingSelection.focus,
    })

    if (selected) {
      mapStore.clearPendingFeatureSelection()
    }

    return selected
  }

  watch(
    () => store.layers,
    async (layersState) => {
      await manager.sync(layersState)

      applyPendingSelection()
    },
    { deep: true, immediate: true }
  )

  watch(
    () => mapStore.pendingFeatureSelection?.token,
    () => {
      applyPendingSelection()
    }
  )

  const reloadSaih = async () => {
    invalidateSaihAlertsCache()
    manager.resetLayerCache('saih')
    await manager.sync(store.layers)
  }

  watch(() => dataSourceStore.selectedDataSource, reloadSaih)
  watch(() => modelStore.selectedModel, reloadSaih)
}
