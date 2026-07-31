<template>
  <div class="container">
    <!-- HEADER FIJO -->
    <div class="header">
      <v-row class="flex-grow-1">
        <v-col cols="12" class="d-flex align-center justify-space-between">
          <h2 class="pl-4 pt-4">Capas</h2>

          <v-btn icon class="mr-4 mt-4" color="primary" density="comfortable" @click="goBack">
            <v-icon>{{ mdAndUp ? 'mdi-arrow-left' : 'mdi-arrow-down' }}</v-icon>
          </v-btn>
        </v-col>
        <v-divider></v-divider>
      </v-row>
    </div>

    <!-- CONTENIDO CON SCROLL -->
    <div class="content mt-4">
      <v-row>
        <v-col cols="12" class="pb-1 px-4">
          <ItemsLayersGroup
            :layers="stationLayers"
            title="Estaciones"
            :multiple="true"
            :default-open="true"
          />
        </v-col>
        <v-col cols="12" class="pt-1 pb-1 px-4">
          <ItemsLayersGroup
            :layers="zonasLayers"
            title="Zonas"
            :multiple="false"
            :default-open="false"
          />
        </v-col>
        <v-col cols="12" class="pt-1 pb-1 px-4">
          <ItemsLayersGroup
            :layers="meteoMaps"
            title="Mapas Meteo"
            :multiple="false"
            :default-open="false"
          />
        </v-col>
        <v-col cols="12" class="pt-1 pb-1 px-4">
          <ItemsLayersGroup
            :layers="efasLayers"
            title="Mapas Efas"
            :multiple="false"
            :default-open="false"
          />
        </v-col>

        <v-col cols="12" class="pt-1 px-4">
          <ItemsLayersGroup
            :layers="filteredAvisosLayers"
            title="Avisos"
            :multiple="false"
            :default-open="false"
          />
        </v-col>
      </v-row>
    </div>

    <!-- ARCHIVO LOCAL: siempre pegado abajo, la lista rellena el hueco -->
    <div class="local-file-section">
      <v-divider class="mb-2" />
      <div v-if="localFileStore.hasStations" class="px-4">
        <p class="font-weight-medium mb-1">Desde Archivo Local</p>

        <div
          v-for="file in localFileStore.files"
          :key="file.id"
          class="d-flex align-center justify-space-between"
        >
          <p class="text-caption text-medium-emphasis mb-0 text-truncate">{{ file.fileName }}</p>
          <v-btn
            icon="mdi-close-circle-outline"
            size="small"
            variant="text"
            color="error"
            @click="onRemoveLocalFile(file.id)"
          />
        </div>
      </div>

      <div class="local-file-list-wrapper px-4">
        <v-alert
          v-if="localFileStore.hasStations && localFileStore.stationsWithPredictions.length === 0"
          type="info"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          El archivo no contiene ninguna estación con predicciones.
        </v-alert>

        <v-list
          v-else-if="localFileStore.hasStations"
          class="local-file-list py-0 mt-2"
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
                  mapStore.hoveredStationCode?.toUpperCase() === station.stationCode.toUpperCase(),
              },
            ]"
            color="primary"
            @click="openLocalFileDetail(station)"
            @mouseenter="onLocalFileItemEnter(station.stationCode)"
            @mouseleave="onLocalFileItemLeave"
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
                  @click="flyToLocalFileStation(station)"
                >
                  <v-icon size="16">mdi-map-marker</v-icon>
                </v-btn>
                <v-btn
                  icon
                  variant="text"
                  density="compact"
                  title="Abrir detalle"
                  @click="openLocalFileDetail(station)"
                >
                  <v-icon size="16">mdi-open-in-new</v-icon>
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </div>

      <div class="local-file-input-row px-4 pb-4">
        <v-alert
          v-if="localFileStore.error"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-2"
        >
          {{ localFileStore.error }}
        </v-alert>

        <v-file-input
          v-model="selectedFiles"
          label="Cargar archivos JSON"
          accept="application/json,.json"
          variant="outlined"
          color="primary"
          bg-color="surface"
          density="compact"
          prepend-icon=""
          prepend-inner-icon="mdi-file-upload-outline"
          hide-details
          multiple
          :loading="loadingLocalFile"
          @update:model-value="onFilesSelected"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ItemsLayersGroup from '../itemslayers/ItemsLayersGroup.vue'

  import {
    stationLayers,
    zonasLayers,
    meteoMaps,
    efasLayers,
    avisosLayers,
  } from '@/constants/itemsLayers'
  import { getAvisosResumenService } from '@/services/avisos'
  import { useDisplay } from 'vuetify'
  import { useLocalFileStore } from '@/stores/localFileStore'
  import { useMapStore } from '@/stores/mapStore'
  import { getSaihTypeColor } from '@/utils/saihStations'
  import { setSaihMarkerHighlight, setSaihMarkerSelected } from '@/utils/saihMarkersRegistry'
  import type { LocalFileStation } from '@/types/LocalStationsFile'

  const { mdAndUp } = useDisplay()

  const route = useRoute()
  const router = useRouter()
  const localFileStore = useLocalFileStore()
  const mapStore = useMapStore()

  const goBack = () => {
    router.push('/')
  }

  const activeCodes = ref<Set<string>>(new Set())

  onMounted(async () => {
    try {
      const resumen = await getAvisosResumenService()
      activeCodes.value = new Set(resumen.categoriasActivas.map((c) => c.code))
    } catch {
      activeCodes.value = new Set()
    }
  })

  const filteredAvisosLayers = computed(() => {
    const base = avisosLayers[0]
    return [
      {
        ...base,
        children: (base.children ?? []).filter((child) => activeCodes.value.has(child.id)),
      },
    ]
  })

  // ── Archivo local ─────────────────────────────────────────────────────────

  const selectedFiles = ref<File[] | null>(null)
  const loadingLocalFile = ref(false)

  async function onFilesSelected(fileOrFiles: File | File[] | null): Promise<void> {
    const list = Array.isArray(fileOrFiles) ? fileOrFiles : fileOrFiles ? [fileOrFiles] : []
    if (list.length === 0) return

    loadingLocalFile.value = true
    try {
      await localFileStore.loadFromFiles(list)
    } finally {
      loadingLocalFile.value = false
      selectedFiles.value = null
    }
  }

  function onRemoveLocalFile(id: string): void {
    localFileStore.removeFile(id)

    const stillSelected = localFileStore.stations.some(
      (s) => s.stationCode === localFileStore.selectedStationCode
    )
    if (!stillSelected && route.query.localStation) {
      const query = { ...route.query }
      delete query.localStation
      router.replace({ query })
    }
  }

  function openLocalFileDetail(station: LocalFileStation): void {
    localFileStore.selectStation(station.stationCode)
    router.replace({ query: { ...route.query, localStation: station.stationCode } })
  }

  function flyToLocalFileStation(station: LocalFileStation): void {
    if (station.latitude == null || station.longitude == null) return
    mapStore.requestFlyTo(station.latitude, station.longitude, { zoom: 13 })
  }

  function onLocalFileItemEnter(stationCode: string): void {
    setSaihMarkerHighlight(stationCode)
    mapStore.setHoveredStation(stationCode)
  }

  function onLocalFileItemLeave(): void {
    setSaihMarkerHighlight(null)
    mapStore.setHoveredStation(null)
  }

  watch(
    () => localFileStore.selectedStationCode,
    (code) => setSaihMarkerSelected(code ?? null)
  )
</script>

<style lang="scss" scoped>
  .container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  // .header {
  //   flex-shrink: 0;
  // }

  .content {
    flex: 0 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }

  // Claims all remaining height below the layer groups, so the file input
  // always sits at the very bottom of the panel and the station list fills
  // whatever space is left above it.
  .local-file-section {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .local-file-list-wrapper {
    flex: 0 1 auto;
    min-height: 0;
    max-height: 30vh;
    overflow-y: auto;
    overflow-x: hidden;
  }

  // margin-top: auto absorbs all free space above this item, so the input
  // stays pinned to the bottom whether the list above is empty, small, or
  // capped at max-height.
  .local-file-input-row {
    flex: 0 0 auto;
    margin-top: auto;
  }

  .local-file-list {
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
