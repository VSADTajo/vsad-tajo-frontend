<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container"></div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, nextTick } from 'vue'
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'
  import { basemapsLayers } from '@/constants/basemaps'
  import { useBasemap } from '@/composables/useBasemaps'
  import { watch } from 'vue'
  import { useBaseLayers } from '@/composables/useBaseLayers'
  import { useDynamicLayers } from '@/composables/useDynamicLayers'
  import { center, defaultZoom } from '@/constants/mapConfig'

  // Referencias
  const mapContainer = ref<HTMLElement | null>(null)
  let map: L.Map

  const { selectedBasemap } = useBasemap()

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

    map = L.map(mapContainer.value, { zoomControl: true }).setView(center, defaultZoom)

    const basemap = basemapsLayers.find((b) => b.id === selectedBasemap.value[0])

    if (basemap) {
      currentTileLayer = L.tileLayer(basemap.url, {
        attribution: basemap.attribution,
      }).addTo(map)
    }

    const { initBaseLayers } = useBaseLayers(map)

    initBaseLayers()
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

  /* Marker custom */
  .custom-marker .marker-circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: #1976d2; /* Vuetify primary */
    border: 2px solid white;
    transition: all 0.2s ease;
  }

  .custom-marker .marker-circle.selected {
    transform: scale(1.5);
    background-color: #ff9800; /* color de selección */
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  }

  .custom-marker .marker-circle:hover {
    transform: scale(1.3);
    cursor: pointer;
  }
</style>
