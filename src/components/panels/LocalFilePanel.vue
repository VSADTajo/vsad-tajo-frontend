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

          <v-col cols="12" class="pt-0 pb-0">
            <v-list class="local-file-list" density="compact">
              <v-list-item
                v-for="station in localFileStore.stations"
                :key="station.id ?? station.stationCode"
                :active="localFileStore.selectedStationCode === station.stationCode"
                @click="openDetail(station)"
              >
                <v-list-item-title>{{ station.stationCode }}</v-list-item-title>
                <v-list-item-subtitle>{{ station.name }}</v-list-item-subtitle>

                <template #append>
                  <v-btn
                    icon="mdi-map-marker"
                    size="x-small"
                    variant="text"
                    :disabled="station.latitude == null || station.longitude == null"
                    @click.stop="flyToStation(station)"
                  />
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
  import { onUnmounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { useLocalFileStore } from '@/stores/localFileStore'
  import { useMapStore } from '@/stores/mapStore'
  import type { LocalFileStation } from '@/types/LocalStationsFile'

  const { mdAndUp } = useDisplay()
  const route = useRoute()
  const router = useRouter()
  const localFileStore = useLocalFileStore()
  const mapStore = useMapStore()

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

  onUnmounted(() => {
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
    padding-bottom: 24px;
  }
</style>
