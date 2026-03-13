<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container"></div>

    <MapTimeControls v-if="hasTemporalLayers" />
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
  import { center, defaultZoom, minZoom } from '@/constants/mapConfig'
  import { createMapPanes } from '@/config/panes/mapPanes'
  import MapTimeControls from '@/components/map/MapTimeControls.vue'
  import { useTimeStore } from '@/stores/timeStore'

  // Referencias
  const mapContainer = ref<HTMLElement | null>(null)
  let map: L.Map

  const { selectedBasemap } = useBasemap()
  const timeStore = useTimeStore()

  const hasTemporalLayers = computed(() => Object.keys(timeStore.layers).length > 0)

  let currentTileLayer: L.TileLayer

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
    }).setView(center, defaultZoom)

    createMapPanes(map)

    const basemap = basemapsLayers.find((b) => b.id === selectedBasemap.value[0])

    if (basemap) {
      currentTileLayer = L.tileLayer(basemap.url, {
        attribution: basemap.attribution,
      }).addTo(map)
    }

    const { initBaseLayers } = useBaseLayers(map)

    await initBaseLayers()
    useDynamicLayers(map)

    // Resize map
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(mapContainer.value)
  })
</script>

<style scoped>
  .map-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
  }

  .map-container {
    flex: 1;
    width: 100%;
    height: 100%;
  }
</style>
