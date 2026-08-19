<template>
  <div class="container">
    <!-- HEADER FIJO -->
    <div class="header bg-background">
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
            title="EFAS"
            :multiple="false"
            :default-open="false"
          />
        </v-col>

        <v-col cols="12" class="pt-1 pb-1 px-4">
          <ItemsLayersGroup
            :layers="filteredAvisosLayers"
            title="Avisos AEMET"
            :multiple="false"
            :default-open="false"
          />
        </v-col>

        <v-col v-if="hasRole('admin')" cols="12" class="pt-1 px-4">
          <ItemsScenariosGroup
            ref="scenariosGroupEl"
            @update:selected-scenario-id="selectedScenarioId = $event"
          />
        </v-col>
      </v-row>
    </div>

    <!-- CARGAR ESCENARIO: bloque de carga/prueba/subida, siempre pegado abajo -->
    <div v-if="hasRole('admin')" class="scenarios-section bg-background">
      <v-divider class="mb-2" />

      <div class="scenarios-bottom px-4 pb-4">
        <v-card elevation="1" class="layers-card" color="primary">
          <v-card-title
            class="layers-title d-flex justify-space-between align-center cursor-pointer"
            @click="isUploaderOpen = !isUploaderOpen"
          >
            <span>Cargar Escenario</span>

            <v-icon>
              {{ isUploaderOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
          </v-card-title>

          <v-expand-transition>
            <div v-show="isUploaderOpen" class="bg-surface-variant pa-3">
              <v-file-input
                v-model="selectedFiles"
                label="Añadir archivos"
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

              <v-expand-transition>
                <div
                  v-if="mergedLocalFiles.length > 0"
                  class="local-file-list mt-3 bg-surface rounded-lg px-2 py-1"
                >
                  <div v-for="entry in mergedLocalFiles" :key="entry.key" class="local-file-row">
                    <v-icon size="16" color="medium-emphasis" class="mr-2">
                      mdi-file-document-outline
                    </v-icon>
                    <p class="text-caption text-medium-emphasis mb-0 text-truncate flex-grow-1">
                      {{ entry.fileName }}
                    </p>
                    <v-btn
                      icon="mdi-close-circle-outline"
                      size="x-small"
                      variant="text"
                      color="error"
                      @click="entry.remove"
                    />
                  </div>
                </div>
              </v-expand-transition>

              <v-alert
                v-if="
                  !selectedScenarioId &&
                  localFileStore.hasStations &&
                  localFileStore.stationsWithPredictions.length === 0
                "
                type="info"
                variant="tonal"
                density="compact"
                class="mt-3"
              >
                El archivo no contiene ninguna estación con predicciones.
              </v-alert>

              <v-alert
                v-if="!selectedScenarioId && localFileStore.error"
                type="error"
                variant="tonal"
                density="compact"
                class="mt-3"
              >
                {{ localFileStore.error }}
              </v-alert>

              <v-expand-transition>
                <div v-if="scenarioFiles.length > 0" class="mt-3">
                  <v-divider class="mb-3" />

                  <v-text-field
                    v-model="scenarioName"
                    label="Nombre del escenario"
                    variant="outlined"
                    color="primary"
                    bg-color="surface"
                    density="compact"
                    hide-details
                  />

                  <v-alert
                    v-if="scenarioUploadError"
                    type="error"
                    variant="tonal"
                    density="compact"
                    class="mt-2"
                  >
                    {{ scenarioUploadError }}
                  </v-alert>

                  <v-btn
                    color="primary"
                    variant="flat"
                    block
                    class="mt-2"
                    prepend-icon="mdi-cloud-upload-outline"
                    :loading="uploadingScenario"
                    :disabled="!scenarioName.trim()"
                    @click="onUploadScenario"
                  >
                    Subir Escenario
                  </v-btn>
                </div>
              </v-expand-transition>
            </div>
          </v-expand-transition>
        </v-card>
      </div>
    </div>

    <v-snackbar
      v-model="scenarioSnackbar.visible"
      :color="scenarioSnackbar.color"
      location="bottom center"
      :timeout="3500"
    >
      {{ scenarioSnackbar.message }}
    </v-snackbar>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import ItemsLayersGroup from '../itemslayers/ItemsLayersGroup.vue'
  import ItemsScenariosGroup from '../itemslayers/ItemsScenariosGroup.vue'

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
  import { createScenarioService, uploadScenarioFilesService } from '@/services/scenarios'
  import { useAuth } from '@/composables/useAuth'

  const { mdAndUp } = useDisplay()

  const route = useRoute()
  const router = useRouter()
  const { hasRole } = useAuth()
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
  const isUploaderOpen = ref(true)
  const selectedScenarioId = ref<string | null>(null)

  type LocalFileEntry = { key: string; fileName: string; remove: () => void }

  // A selected scenario's downloaded files also live in localFileStore (see
  // ItemsScenariosGroup), but they don't belong in this "about to upload"
  // preview — that list is only for files picked through the input below.
  const mergedLocalFiles = computed<LocalFileEntry[]>(() => {
    if (selectedScenarioId.value) return []

    return [
      ...localFileStore.files.map((file) => ({
        key: `station-${file.id}`,
        fileName: file.fileName,
        remove: () => onRemoveLocalFile(file.id),
      })),
      ...localArealFileStore.files.map((file) => ({
        key: `areal-${file.id}`,
        fileName: file.fileName,
        remove: () => localArealFileStore.removeFile(file.id),
      })),
    ]
  })

  async function onFilesSelected(fileOrFiles: File | File[] | null): Promise<void> {
    const list = Array.isArray(fileOrFiles) ? fileOrFiles : fileOrFiles ? [fileOrFiles] : []
    if (list.length === 0) return

    // Manually loaded files take priority over an active scenario: drop the
    // scenario's data instead of merging with it, and deselect it so the
    // two modes never mix.
    if (selectedScenarioId.value) {
      localFileStore.clear()
      localArealFileStore.clear()
      scenariosGroupEl.value?.clearSelection()
    }

    scenarioFiles.value = [...scenarioFiles.value, ...list]

    loadingLocalFile.value = true
    try {
      await localFileStore.loadFromFiles(list)
    } finally {
      loadingLocalFile.value = false
      selectedFiles.value = null
    }
  }

  // ── Escenario: subida de los archivos cargados al backend ──────────────────

  const scenarioFiles = ref<File[]>([])
  const scenarioName = ref('')
  const uploadingScenario = ref(false)
  const scenarioUploadError = ref<string | null>(null)
  const scenarioSnackbar = ref({ visible: false, message: '', color: 'success' })
  const scenariosGroupEl = ref<InstanceType<typeof ItemsScenariosGroup> | null>(null)

  async function onUploadScenario(): Promise<void> {
    const name = scenarioName.value.trim()
    if (!name || scenarioFiles.value.length === 0) return

    uploadingScenario.value = true
    scenarioUploadError.value = null
    try {
      const scenario = await createScenarioService({ name, payload: {} })
      await uploadScenarioFilesService(scenario.id, scenarioFiles.value)

      scenarioFiles.value = []
      scenarioName.value = ''
      scenarioSnackbar.value = {
        visible: true,
        message: 'Escenario subido correctamente',
        color: 'success',
      }
      scenariosGroupEl.value?.refresh()
    } catch {
      scenarioUploadError.value = 'Error subiendo el escenario. Inténtalo de nuevo.'
    } finally {
      uploadingScenario.value = false
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
  // Fixed header + fixed footer, with exactly ONE scrolling region in
  // between (.content). Two nested `overflow: auto` regions (or a sticky
  // footer fighting an auto margin) is what produced two scrollbars stacked
  // on top of each other, and the sticky footer overlapping list items —
  // this plain 3-row flex split has no such interaction.
  .container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .header {
    flex-shrink: 0;
  }

  .content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .scenarios-section {
    flex-shrink: 0;
  }

  .scenarios-bottom {
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
