<template>
  <v-card elevation="1" class="layers-card" color="primary">
    <v-card-title
      class="layers-title d-flex justify-space-between align-center cursor-pointer"
      @click="isOpen = !isOpen"
    >
      <span>Escenarios</span>

      <v-icon>
        {{ isOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
      </v-icon>
    </v-card-title>

    <v-expand-transition>
      <div v-show="isOpen">
        <v-list bg-color="surface_variant" density="compact">
          <v-list-item
            v-if="loadingScenarios"
            title="Cargando escenarios..."
            disabled
            class="text-caption text-medium-emphasis"
          />

          <v-list-item
            v-else-if="scenarios.length === 0"
            title="No hay escenarios guardados"
            disabled
            class="text-caption text-medium-emphasis"
          />

          <template v-else>
            <v-list-group v-for="scenario in scenarios" :key="scenario.id" :value="scenario.id">
              <template #activator="{ props }">
                <v-list-item
                  v-bind="props"
                  :title="scenario.name"
                  class="border"
                  @click.stop="onExpandScenario(scenario)"
                />
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
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import {
    getScenariosService,
    getScenarioService,
    deleteScenarioFileService,
  } from '@/services/scenarios'
  import type { ScenarioFile, ScenarioSummary } from '@/types/Scenarios'

  const isOpen = ref(false)
  const loadingScenarios = ref(true)
  const scenarios = ref<ScenarioSummary[]>([])
  const filesByScenarioId = reactive<Record<string, ScenarioFile[]>>({})
  const filesLoadingById = reactive<Record<string, boolean>>({})
  const deletingFileId = ref<string | null>(null)
  const deleteError = ref<string | null>(null)

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

  async function onExpandScenario(scenario: ScenarioSummary): Promise<void> {
    if (filesByScenarioId[scenario.id]) return

    filesLoadingById[scenario.id] = true
    try {
      const full = await getScenarioService(scenario.id)
      filesByScenarioId[scenario.id] = full.files
    } catch {
      filesByScenarioId[scenario.id] = []
    } finally {
      filesLoadingById[scenario.id] = false
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

  function refresh(): void {
    for (const key of Object.keys(filesByScenarioId)) {
      delete filesByScenarioId[key]
    }
    void loadScenarios()
  }

  onMounted(loadScenarios)

  defineExpose({ refresh })
</script>

<style scoped></style>
