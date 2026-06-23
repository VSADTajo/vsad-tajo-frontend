<template>
  <div class="map-wrapper">
    <div class="map-area">
      <div ref="mapContainer" class="map-container"></div>

      <MapAvisosTimeControls v-if="hasSelectedAviso && mdAndUp" :stacked="hasBottomTimeControls" />
      <MapTimeRangeControls v-if="hasTemporalRangeLayers && mdAndUp" />
      <MapTimeControls v-else-if="hasTemporalLayers && mdAndUp" />

      <div v-if="isSimulationsRoute" class="simulation-controls">
        <MapSimulationButton />
        <v-tooltip
          :text="
            simulationHistoryOpen ? 'Cerrar lista de simulaciones' : 'Abrir lista de simulaciones'
          "
          location="left"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              icon
              size="large"
              :color="simulationHistoryOpen ? 'primary' : undefined"
              :variant="simulationHistoryOpen ? 'flat' : 'tonal'"
              elevation="4"
              @click="simulationsStore.toggleHistory()"
            >
              <v-icon size="26">
                {{ simulationHistoryOpen ? 'mdi-chevron-right' : 'mdi-chevron-left' }}
              </v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </div>
    </div>

    <MapSimulationsHistorySidebar
      v-if="isSimulationsRoute"
      :open="simulationHistoryOpen"
      @close="simulationsStore.closeHistory()"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, nextTick, computed } from 'vue'
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import { basemapsLayers } from '@/constants/basemaps'
  import { useBasemap } from '@/composables/useBasemaps'
  import { watch } from 'vue'
  import { useBaseLayers } from '@/composables/useBaseLayers'
  import { useDynamicLayers } from '@/composables/useDynamicLayers'
  import { useAvisosLayers } from '@/composables/useAvisosLayers'
  import { center, defaultZoom, defaultZoomForMobile, minZoom } from '@/constants/mapConfig'
  import { createMapPanes } from '@/config/panes/mapPanes'
  import MapAvisosTimeControls from '@/components/map/MapAvisosTimeControls.vue'
  import MapTimeControls from '@/components/map/MapTimeControls.vue'
  import MapTimeRangeControls from '@/components/map/MapTimeRangeControls.vue'
  import MapSimulationButton from '@/components/map/MapSimulationButton.vue'
  import MapSimulationsHistorySidebar from '@/components/rightContainer/MapSimulationsHistorySidebar.vue'
  import { dynamicLayersConfig } from '@/config/layers.config'
  import { useAvisosStore } from '@/stores/avisosStore'
  import { useLayersStore } from '@/stores/layersStore'
  import { useMapStore } from '@/stores/mapStore'
  import { useSimulationsStore } from '@/stores/simulationsStore'
  import { useDisplay } from 'vuetify'
  import { useRoute } from 'vue-router'

  const route = useRoute()
  const layersStore = useLayersStore()
  const avisosStore = useAvisosStore()
  const mapStore = useMapStore()
  const simulationsStore = useSimulationsStore()
  const { mdAndUp } = useDisplay()

  const isSimulationsRoute = computed(() => route.name === 'simulaciones')
  const simulationHistoryOpen = computed(() => simulationsStore.historyOpen)

  const temporalRangeLayerIds = new Set(
    dynamicLayersConfig
      .filter((config) => config.temporalControlMode === 'range')
      .map((config) => config.id)
  )

  const mapContainer = ref<HTMLElement | null>(null)
  let map: L.Map

  const { selectedBasemap } = useBasemap()

  const hasTemporalLayers = computed(() =>
    Object.values(layersStore.layers).some(
      (layer) => layer.visible && layer.temporal && !temporalRangeLayerIds.has(layer.id)
    )
  )

  const hasTemporalRangeLayers = computed(() =>
    Object.values(layersStore.layers).some(
      (layer) => layer.visible && layer.temporal && temporalRangeLayerIds.has(layer.id)
    )
  )

  const hasSelectedAviso = computed(() => Boolean(avisosStore.selectedTipo))
  const hasBottomTimeControls = computed(
    () => hasTemporalRangeLayers.value || hasTemporalLayers.value
  )

  let currentTileLayer: L.TileLayer

  watch(
    () => mapStore.flyToTarget,
    (target) => {
      if (!target || !map) return

      map.flyTo([target.lat, target.lng], target.zoom ?? Math.max(map.getZoom(), 11), {
        animate: target.animate ?? true,
        duration: 0.8,
      })

      mapStore.clearFlyToTarget()
    }
  )

  watch(selectedBasemap, (newId) => {
    if (!map) return

    const config = basemapsLayers.find((b) => b.id === newId[0])
    if (!config) return

    if (currentTileLayer) {
      map.removeLayer(currentTileLayer)
    }

    currentTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
    }).addTo(map)
  })

  onMounted(async () => {
    await nextTick()

    if (!mapContainer.value) return

    map = L.map(mapContainer.value, {
      zoomControl: true,
      minZoom,
    }).setView(center, mdAndUp.value ? defaultZoom : defaultZoomForMobile)

    createMapPanes(map)

    const basemap = basemapsLayers.find((b) => b.id === selectedBasemap.value[0])

    if (basemap) {
      currentTileLayer = L.tileLayer(basemap.url, {
        attribution: basemap.attribution,
      }).addTo(map)
    }

    const { initBaseLayers } = useBaseLayers(map)

    useDynamicLayers(map)
    useAvisosLayers(map)
    await initBaseLayers()

    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(mapContainer.value)
  })
</script>

<style scoped>
  .map-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
  }

  .map-area {
    flex: 1;
    position: relative;
    min-width: 0;
    height: 100%;
  }

  .map-container {
    width: 100%;
    height: 100%;
  }

  .simulation-controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
</style>
