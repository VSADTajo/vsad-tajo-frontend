<template>
  <div class="local-file-container">
    <div class="local-file-title">
      <v-row>
        <v-col cols="12" class="d-flex align-center justify-space-between">
          <h2 class="pl-4 pt-4">Archivo local</h2>
          <div class="d-flex align-center mr-4 mt-4 gap-2">
            <v-btn icon color="primary" density="comfortable" @click="goBack">
              <v-icon>{{ mdAndUp ? 'mdi-arrow-left' : 'mdi-arrow-down' }}</v-icon>
            </v-btn>
          </div>
        </v-col>
        <v-divider />
      </v-row>
    </div>

    <div class="local-file-body mt-4">
      <v-row class="mt-1">
        <v-col cols="12" class="pt-2 pb-2">
          <v-file-input
            v-model="selectedFile"
            label="Cargar archivo JSON"
            accept="application/json,.json"
            variant="outlined"
            color="primary"
            bg-color="surface"
            density="compact"
            prepend-icon=""
            prepend-inner-icon="mdi-file-upload-outline"
            hide-details
            class="px-3"
            :loading="loading"
            @update:model-value="onFileSelected"
          />
        </v-col>

        <v-col v-if="localFileStore.error" cols="12" class="pt-0">
          <v-alert type="error" variant="tonal" density="compact" class="mx-3">
            {{ localFileStore.error }}
          </v-alert>
        </v-col>

        <template v-if="localFileStore.hasStations">
          <v-col cols="12" class="d-flex align-center justify-space-between pt-2">
            <p class="pl-4 font-weight-medium mb-0">
              {{ localFileStore.fileName }} — {{ localFileStore.validStationCount }} estación(es)
              con predicciones
            </p>
            <v-btn
              icon="mdi-close-circle-outline"
              size="small"
              variant="text"
              color="error"
              class="mr-2"
              @click="onClear"
            />
          </v-col>

          <v-col v-if="localFileStore.stationsWithPredictions.length === 0" cols="12" class="pt-0">
            <v-alert type="info" variant="tonal" density="compact" class="mx-3">
              El archivo no contiene ninguna estación con predicciones.
            </v-alert>
          </v-col>

          <v-col v-else cols="12" class="pt-0 pb-0">
            <v-list
              class="local-file-list py-0"
              density="compact"
              bg-color="surface_variant border"
            >
              <v-list-item
                v-for="station in localFileStore.stationsWithPredictions"
                :key="station.id ?? station.stationCode"
                :active="localFileStore.selectedStationCode === station.stationCode"
                :class="[
                  'border',
                  {
                    'item-map-hover':
                      mapStore.hoveredStationCode?.toUpperCase() ===
                      station.stationCode.toUpperCase(),
                  },
                ]"
                color="primary"
                @click="openDetail(station)"
                @mouseenter="onItemEnter(station.stationCode)"
                @mouseleave="onItemLeave"
              >
                <template #prepend>
                  <div
                    class="saih-marker mr-3"
                    :style="{ '--saih-color': getSaihTypeColor(station.tipoCod), flexShrink: 0 }"
                  >
                    {{ station.tipoCod ?? '?' }}
                  </div>
                </template>

                <v-list-item-title class="text-body-2 font-weight-medium">
                  {{ station.name }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ station.stationCode }}
                </v-list-item-subtitle>

                <template #append>
                  <div class="local-file-actions" @click.stop>
                    <v-btn
                      icon
                      variant="text"
                      density="compact"
                      title="Ir a la estación"
                      color="primary"
                      class="mr-2"
                      :disabled="station.latitude == null || station.longitude == null"
                      @click="flyToStation(station)"
                    >
                      <v-icon size="16">mdi-map-marker</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      variant="text"
                      density="compact"
                      title="Abrir detalle"
                      @click="openDetail(station)"
                    >
                      <v-icon size="16">mdi-open-in-new</v-icon>
                    </v-btn>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-col>
        </template>

        <v-col v-else cols="12" class="pt-4">
          <p class="pl-4 text-medium-emphasis">
            Selecciona un archivo JSON con el formato
            <code>{ items: [...] }</code>
            para ver sus estaciones y predicciones en el mapa.
          </p>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { useLocalFileStore } from '@/stores/localFileStore'
  import { useMapStore } from '@/stores/mapStore'
  import { useLayersStore } from '@/stores/layersStore'
  import { getSaihTypeColor } from '@/utils/saihStations'
  import { setSaihMarkerHighlight, setSaihMarkerSelected } from '@/utils/saihMarkersRegistry'
  import type { LocalFileStation } from '@/types/LocalStationsFile'

  const { mdAndUp } = useDisplay()
  const route = useRoute()
  const router = useRouter()
  const localFileStore = useLocalFileStore()
  const mapStore = useMapStore()
  const layersStore = useLayersStore()

  const selectedFile = ref<File | null>(null)
  const loading = ref(false)

  async function onFileSelected(file: File | File[] | null): Promise<void> {
    const target = Array.isArray(file) ? file[0] : file
    if (!target) return

    loading.value = true
    try {
      await localFileStore.loadFromFile(target)
    } finally {
      loading.value = false
    }
  }

  function onClear(): void {
    selectedFile.value = null
    localFileStore.clear()

    if (route.query.localStation) {
      const query = { ...route.query }
      delete query.localStation
      router.replace({ query })
    }
  }

  function openDetail(station: LocalFileStation): void {
    localFileStore.selectStation(station.stationCode)
    router.replace({ query: { ...route.query, localStation: station.stationCode } })
  }

  function flyToStation(station: LocalFileStation): void {
    if (station.latitude == null || station.longitude == null) return
    mapStore.requestFlyTo(station.latitude, station.longitude, { zoom: 13 })
  }

  function goBack(): void {
    router.push('/')
  }

  function onItemEnter(stationCode: string): void {
    setSaihMarkerHighlight(stationCode)
    mapStore.setHoveredStation(stationCode)
  }

  function onItemLeave(): void {
    setSaihMarkerHighlight(null)
    mapStore.setHoveredStation(null)
  }

  watch(
    () => localFileStore.selectedStationCode,
    (code) => setSaihMarkerSelected(code ?? null)
  )

  onMounted(() => {
    layersStore.applyLocalFilePreset()
  })

  onUnmounted(() => {
    layersStore.resetStationLayers()
    setSaihMarkerSelected(null)

    if (route.query.localStation) {
      const query = { ...route.query }
      delete query.localStation
      router.replace({ query })
    }
  })
</script>

<style scoped>
  .local-file-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .local-file-body {
    flex-grow: 0;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .local-file-list {
    flex: 1 1 0;
    min-height: 0;
    max-height: 40vh;
    padding-bottom: 24px;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(110, 118, 129, 0.5) transparent;
  }

  .local-file-list::-webkit-scrollbar {
    width: 5px;
  }

  .local-file-list::-webkit-scrollbar-thumb {
    background: rgba(110, 118, 129, 0.5);
    border-radius: 999px;
  }

  .item-map-hover {
    background: rgb(var(--v-theme-primary), 0.08) !important;
  }

  .local-file-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
</style>
