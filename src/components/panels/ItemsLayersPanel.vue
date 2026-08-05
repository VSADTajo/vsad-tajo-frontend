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

    <!-- ARCHIVO LOCAL: bloque agrupado (lista + input) siempre pegado abajo -->
    <div class="local-file-section">
      <v-divider class="mb-2" />

      <div class="local-file-bottom px-4 pb-4">
        <template v-if="localFileStore.hasStations || localArealFileStore.hasAreas">
          <div class="d-flex align-center justify-space-between mb-1">
            <p class="font-weight-medium mb-0">Desde Archivo Local</p>
            <span class="text-caption text-medium-emphasis">{{ localFileCount }} archivo(s)</span>
          </div>

          <div class="local-file-list mb-3">
            <div
              v-for="file in localFileStore.files"
              :key="`station-${file.id}`"
              class="local-file-row"
            >
              <v-icon size="16" color="medium-emphasis" class="mr-2">
                mdi-file-document-outline
              </v-icon>
              <p class="text-caption text-medium-emphasis mb-0 text-truncate flex-grow-1">
                {{ file.fileName }}
              </p>
              <v-btn
                icon="mdi-close-circle-outline"
                size="x-small"
                variant="text"
                color="error"
                @click="onRemoveLocalFile(file.id)"
              />
            </div>

            <div
              v-for="file in localArealFileStore.files"
              :key="`areal-${file.id}`"
              class="local-file-row"
            >
              <v-icon size="16" color="medium-emphasis" class="mr-2">
                mdi-file-document-outline
              </v-icon>
              <p class="text-caption text-medium-emphasis mb-0 text-truncate flex-grow-1">
                {{ file.fileName }}
              </p>
              <v-btn
                icon="mdi-close-circle-outline"
                size="x-small"
                variant="text"
                color="error"
                @click="localArealFileStore.removeFile(file.id)"
              />
            </div>
          </div>
        </template>

        <v-alert
          v-if="localFileStore.hasStations && localFileStore.stationsWithPredictions.length === 0"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-2"
        >
          El archivo no contiene ninguna estación con predicciones.
        </v-alert>

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
          label="Cargar Escenario"
          accept="application/json,.json,.csv,text/csv"
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
  import { useLocalArealFileStore } from '@/stores/localArealFileStore'
  import { setSaihMarkerSelected } from '@/utils/saihMarkersRegistry'

  const { mdAndUp } = useDisplay()

  const route = useRoute()
  const router = useRouter()
  const localFileStore = useLocalFileStore()
  const localArealFileStore = useLocalArealFileStore()

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

  const localFileCount = computed(
    () => localFileStore.files.length + localArealFileStore.files.length
  )

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

  .local-file-section {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  // margin-top: auto absorbs all free space above, so the whole group
  // (loaded-files list + input) stays together pinned to the bottom instead
  // of the list drifting away from the input.
  .local-file-bottom {
    flex: 0 0 auto;
    margin-top: auto;
    display: flex;
    flex-direction: column;
  }

  // Capped so 5+ loaded files scroll internally instead of pushing the
  // input down or growing the panel.
  .local-file-list {
    max-height: 25vh;
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

  .local-file-row {
    display: flex;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .local-file-row:last-child {
    border-bottom: none;
  }
</style>
