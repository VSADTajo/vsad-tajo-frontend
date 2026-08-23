<template>
  <v-card elevation="1" class="layers-card" color="primary">
    <v-card-title
      class="layers-title d-flex justify-space-between align-center cursor-pointer"
      @click="isOpen = !isOpen"
    >
      <span>Eventos Pasados</span>

      <v-icon>
        {{ isOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
      </v-icon>
    </v-card-title>

    <v-expand-transition>
      <div v-show="isOpen">
        <v-list bg-color="surface_variant" density="compact">
          <v-list-item
            v-if="loadingScenarios"
            title="Cargando Eventos Pasados..."
            disabled
            class="text-caption text-medium-emphasis"
          />

          <v-list-item
            v-else-if="scenarios.length === 0"
            title="No hay Eventos Pasados Guardados"
            disabled
            class="text-caption text-medium-emphasis"
          />

          <template v-else>
            <v-list-group v-for="scenario in scenarios" :key="scenario.id" :value="scenario.id">
              <template #activator="{ props }">
                <v-list-item v-bind="props" class="border" @click.stop="onExpandScenario(scenario)">
                  <template #prepend>
                    <v-progress-circular
                      v-if="loadingSelectionId === scenario.id"
                      indeterminate
                      size="20"
                      width="2"
                      color="success"
                      class="mr-2"
                    />
                    <v-checkbox
                      v-else
                      density="compact"
                      hide-details
                      class="mr-2"
                      color="success"
                      :model-value="selectedScenarioId === scenario.id"
                      @click.stop="toggleScenarioSelection(scenario)"
                    />
                  </template>

                  <v-list-item-title>{{ scenario.name }}</v-list-item-title>

                  <template #append>
                    <v-btn
                      icon="mdi-trash-can-outline"
                      size="x-small"
                      variant="text"
                      color="error"
                      @click.stop="scenarioPendingDelete = scenario"
                    />
                  </template>
                </v-list-item>
              </template>

              <v-list-item
                v-if="filesLoadingById[scenario.id]"
                title="Cargando archivos..."
                disabled
                class="text-caption text-medium-emphasis"
              />

              <v-list-item
                v-else-if="(filesByScenarioId[scenario.id] ?? []).length === 0"
                title="Sin archivos"
                disabled
                class="text-caption text-medium-emphasis"
              />

              <template v-else>
                <v-list-item
                  v-for="file in filesByScenarioId[scenario.id]"
                  :key="file.id"
                  :title="file.filename"
                  :subtitle="formatFileSize(file.sizeBytes)"
                  class="border"
                >
                  <template #append>
                    <v-btn
                      icon="mdi-delete-outline"
                      size="x-small"
                      variant="text"
                      color="error"
                      :loading="deletingFileId === file.id"
                      @click.stop="onDeleteFile(scenario.id, file.id)"
                    />
                  </template>
                </v-list-item>
              </template>
            </v-list-group>
          </template>
        </v-list>

        <v-alert v-if="deleteError" type="error" variant="tonal" density="compact" class="ma-2">
          {{ deleteError }}
        </v-alert>

        <v-alert v-if="selectionError" type="error" variant="tonal" density="compact" class="ma-2">
          {{ selectionError }}
        </v-alert>
      </div>
    </v-expand-transition>
  </v-card>

  <v-dialog
    :model-value="scenarioPendingDelete !== null"
    max-width="380"
    @update:model-value="!deletingScenario && (scenarioPendingDelete = null)"
  >
    <v-card v-if="scenarioPendingDelete">
      <v-card-title class="text-subtitle-1 pt-4 px-4 bg-primary">Eliminar Evento</v-card-title>
      <v-card-text class="px-4 pb-2">
        ¿Estás seguro de eliminar el Evento "{{ scenarioPendingDelete.name }}" y todos sus archivos?
      </v-card-text>
      <v-card-actions class="px-4 pb-4 pt-2">
        <v-spacer />
        <v-btn variant="text" :disabled="deletingScenario" @click="scenarioPendingDelete = null">
          Cancelar
        </v-btn>
        <v-btn color="error" variant="flat" :loading="deletingScenario" @click="onDeleteScenario">
          Eliminar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import {
    getScenariosService,
    getScenarioService,
    deleteScenarioService,
    deleteScenarioFileService,
    downloadScenarioFileService,
  } from '@/services/scenarios'
  import type { ScenarioFile, ScenarioSummary } from '@/types/Scenarios'
  import { useLocalFileStore } from '@/stores/localFileStore'
  import { useLocalArealFileStore } from '@/stores/localArealFileStore'

  const emit = defineEmits<{
    (e: 'update:selected-scenario-id', value: string | null): void
  }>()

  const localFileStore = useLocalFileStore()
  const localArealFileStore = useLocalArealFileStore()

  const isOpen = ref(false)
  const loadingScenarios = ref(true)
  const scenarios = ref<ScenarioSummary[]>([])
  const filesByScenarioId = reactive<Record<string, ScenarioFile[]>>({})
  const filesLoadingById = reactive<Record<string, boolean>>({})
  const deletingFileId = ref<string | null>(null)
  const deleteError = ref<string | null>(null)
  const selectedScenarioId = ref<string | null>(null)
  const loadingSelectionId = ref<string | null>(null)
  const selectionError = ref<string | null>(null)
  const scenarioPendingDelete = ref<ScenarioSummary | null>(null)
  const deletingScenario = ref(false)

  // Selecting a saved scenario should behave exactly like picking its files
  // in "Cargar Escenario" by hand: download each one and feed them through
  // the same local-file store the manual loader uses, which is what flips
  // the map into "scenario mode" (see useLocalFileLayer).
  async function toggleScenarioSelection(scenario: ScenarioSummary): Promise<void> {
    if (selectedScenarioId.value === scenario.id) {
      selectedScenarioId.value = null
      emit('update:selected-scenario-id', null)
      localFileStore.clear()
      localArealFileStore.clear()
      return
    }

    // Manually loaded files take priority over scenario selection: if no
    // scenario is currently active but the store already has data, that
    // data can only have come from the "Cargar Escenario" file input —
    // it must be cleared by hand before a scenario can be picked.
    const hasManualFiles =
      selectedScenarioId.value === null &&
      (localFileStore.hasStations || localArealFileStore.hasAreas)

    if (hasManualFiles) {
      selectionError.value =
        'Ya tienes archivos cargados manualmente. Elimínalos antes de seleccionar un Evento.'
      return
    }

    selectedScenarioId.value = scenario.id
    emit('update:selected-scenario-id', scenario.id)

    loadingSelectionId.value = scenario.id
    selectionError.value = null
    try {
      const files = await ensureScenarioFiles(scenario)
      const downloaded = await Promise.all(
        files.map(async (file) => {
          const blob = await downloadScenarioFileService(scenario.id, file.id)
          return new File([blob], file.filename, { type: file.contentType })
        })
      )

      localFileStore.clear()
      localArealFileStore.clear()
      await localFileStore.loadFromFiles(downloaded)
    } catch {
      selectionError.value = 'Error cargando los datos del Evento.'
      selectedScenarioId.value = null
      emit('update:selected-scenario-id', null)
    } finally {
      loadingSelectionId.value = null
    }
  }

  function formatFileSize(bytes: number): string {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  async function loadScenarios(): Promise<void> {
    loadingScenarios.value = true
    try {
      scenarios.value = await getScenariosService()
    } catch {
      scenarios.value = []
    } finally {
      loadingScenarios.value = false
    }
  }

  async function ensureScenarioFiles(scenario: ScenarioSummary): Promise<ScenarioFile[]> {
    const cached = filesByScenarioId[scenario.id]
    if (cached) return cached

    filesLoadingById[scenario.id] = true
    try {
      const full = await getScenarioService(scenario.id)
      filesByScenarioId[scenario.id] = full.files
      return full.files
    } catch (error) {
      filesByScenarioId[scenario.id] = []
      throw error
    } finally {
      filesLoadingById[scenario.id] = false
    }
  }

  async function onExpandScenario(scenario: ScenarioSummary): Promise<void> {
    try {
      await ensureScenarioFiles(scenario)
    } catch {
      // filesByScenarioId already holds [] on failure — the "Sin archivos"
      // row covers it, no separate error state needed for this path.
    }
  }

  async function onDeleteFile(scenarioId: string, fileId: string): Promise<void> {
    deletingFileId.value = fileId
    deleteError.value = null
    try {
      await deleteScenarioFileService(scenarioId, fileId)
      filesByScenarioId[scenarioId] = (filesByScenarioId[scenarioId] ?? []).filter(
        (f) => f.id !== fileId
      )
    } catch {
      deleteError.value = 'Error eliminando el archivo. Inténtalo de nuevo.'
    } finally {
      deletingFileId.value = null
    }
  }

  async function onDeleteScenario(): Promise<void> {
    const scenario = scenarioPendingDelete.value
    if (!scenario) return

    deletingScenario.value = true
    try {
      await deleteScenarioService(scenario.id)

      scenarios.value = scenarios.value.filter((s) => s.id !== scenario.id)
      delete filesByScenarioId[scenario.id]
      delete filesLoadingById[scenario.id]

      if (selectedScenarioId.value === scenario.id) {
        selectedScenarioId.value = null
        emit('update:selected-scenario-id', null)
        localFileStore.clear()
        localArealFileStore.clear()
      }

      scenarioPendingDelete.value = null
    } catch {
      deleteError.value = 'Error eliminando el Evento. Inténtalo de nuevo.'
    } finally {
      deletingScenario.value = false
    }
  }

  function refresh(): void {
    for (const key of Object.keys(filesByScenarioId)) {
      delete filesByScenarioId[key]
    }
    void loadScenarios().then(() => {
      if (
        selectedScenarioId.value &&
        !scenarios.value.some((s) => s.id === selectedScenarioId.value)
      ) {
        selectedScenarioId.value = null
        emit('update:selected-scenario-id', null)
      }
    })
  }

  // Called by the parent panel when the user loads files by hand — manual
  // loading wins, so any active scenario selection is dropped without
  // touching the store (the manual loader owns it from here).
  function clearSelection(): void {
    if (selectedScenarioId.value === null) return
    selectedScenarioId.value = null
    emit('update:selected-scenario-id', null)
  }

  onMounted(loadScenarios)

  defineExpose({ refresh, selectedScenarioId, clearSelection })
</script>

<style scoped></style>
