<template>
  <div class="map-wrapper">
    <div class="map-area">
      <div ref="mapContainer" class="map-container"></div>

      <MapAvisosTimeControls v-if="hasSelectedAviso && mdAndUp" :stacked="hasBottomTimeControls" />
      <MapTimeRangeControls v-if="hasTemporalRangeLayers && mdAndUp" />
      <MapTimeControls v-else-if="hasTemporalLayers && mdAndUp" />

      <div v-if="!isSimulationsRoute && !hasLocalFileStations" class="map-data-source-toggle">
        <!--
          The model toggle's width changes with its button count (2 for
          Observado, 3 otherwise) — it goes first so that resizing only
          shifts its own left edge, never the data-source toggle next to it.
        -->
        <v-btn-toggle
          v-model="selectedModel"
          mandatory
          density="compact"
          divided
          variant="flat"
          color="primary"
          rounded="lg"
          elevation="4"
          class="bg-primary"
        >
          <template v-if="selectedDataSource === 'observado'">
            <v-btn value="caudal" size="small">Caudal</v-btn>
            <v-btn value="precipitacion" size="small">Precipitación</v-btn>
          </template>
          <template v-else>
            <v-btn value="nam" size="small">Caudal NAM</v-btn>
            <v-btn value="mike11" size="small">Caudal MIKE</v-btn>
            <v-btn value="precipitacion" size="small">Precipitaciones</v-btn>
          </template>
        </v-btn-toggle>

        <v-btn-toggle
          v-model="selectedDataSource"
          mandatory
          density="compact"
          divided
          variant="flat"
          color="primary"
          rounded="lg"
          elevation="4"
          class="bg-primary"
        >
          <v-btn value="observado" size="small">Observado</v-btn>
          <v-btn value="harmonie" size="small">Harmonie</v-btn>
          <v-btn value="epsmedio" size="small">EPS Medio</v-btn>
        </v-btn-toggle>
      </div>

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
  import { useLocalFileLayer } from '@/composables/useLocalFileLayer'
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
  import { useMapDataSourceStore } from '@/stores/mapDataSourceStore'
  import { useMapModelStore } from '@/stores/mapModelStore'
  import { useLocalFileStore } from '@/stores/localFileStore'

  const route = useRoute()
  const layersStore = useLayersStore()
  const avisosStore = useAvisosStore()
  const mapStore = useMapStore()
  const simulationsStore = useSimulationsStore()
  const dataSourceStore = useMapDataSourceStore()
  const modelStore = useMapModelStore()
  const localFileStore = useLocalFileStore()
  const { mdAndUp } = useDisplay()

  const isSimulationsRoute = computed(() => route.name === 'simulaciones')
  const hasLocalFileStations = computed(() => localFileStore.stationsWithPredictions.length > 0)
  const selectedDataSource = computed({
    get: () => dataSourceStore.selectedDataSource,
    set: (v) => {
      dataSourceStore.selectedDataSource = v
    },
  })
  const selectedModel = computed({
    get: () => modelStore.selectedModel,
    set: (v) => {
      modelStore.selectedModel = v
    },
  })
  const simulationHistoryOpen = computed(() => simulationsStore.historyOpen)

  // The model toggle's button set changes with the data source (Observado
  // only has Caudal/Precipitación, no NAM vs MIKE11 split) — keep the
  // selection valid for whichever set is currently shown instead of
  // leaving it pointing at a button that no longer exists.
  watch(selectedDataSource, (source) => {
    if (
      source === 'observado' &&
      (selectedModel.value === 'nam' || selectedModel.value === 'mike11')
    ) {
      selectedModel.value = 'caudal'
    } else if (source !== 'observado' && selectedModel.value === 'caudal') {
      selectedModel.value = 'nam'
    }
  })

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

    // Must run before useDynamicLayers: it hides the live SAIH layers
    // synchronously via layersStore when a local file is already loaded.
    // useDynamicLayers's watcher is `immediate`, so on a cold reload (no
    // cached WFS layer yet) its very first sync would otherwise capture
    // "stations visible" and race the slower live fetch against the local
    // file's hide — sometimes losing, leaving live markers clickable on top
    // of (or instead of) the file's own.
    useLocalFileLayer(map)
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

  .map-data-source-toggle {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 16px;
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
