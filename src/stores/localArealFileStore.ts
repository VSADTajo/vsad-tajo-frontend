import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed } from 'vue'
import type { LocalArealArea } from '@/types/LocalArealFile'
import type { DataStationPrediction } from '@/types/Predictions'

export interface LoadedLocalArealFile {
  id: string
  fileName: string
  areas: LocalArealArea[]
}

function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Same reasoning as localFileStore's mergeStationsByCode: obs/harmonie/eps
// for the same area can come from separate files and must combine into one
// entry instead of showing up three times.
function mergeAreasById(files: LoadedLocalArealFile[]): LocalArealArea[] {
  const byId = new Map<string, LocalArealArea>()

  for (const file of files) {
    for (const area of file.areas) {
      const existing = byId.get(area.id)

      if (!existing) {
        byId.set(area.id, { ...area, predictions: { ...area.predictions } })
        continue
      }

      existing.predictions = {
        ...existing.predictions,
        ...area.predictions,
      } as DataStationPrediction
    }
  }

  return [...byId.values()]
}

export const useLocalArealFileStore = defineStore('localArealFile', () => {
  // Persisted so a reload keeps showing the last areal files loaded, same as
  // localFileStore does for station files.
  const files = useStorage<LoadedLocalArealFile[]>('localArealFile:files', [])

  const areas = computed<LocalArealArea[]>(() => mergeAreasById(files.value))
  const hasAreas = computed(() => files.value.length > 0)

  function ingest(fileName: string, parsedAreas: LocalArealArea[]): void {
    files.value = [...files.value, { id: generateFileId(), fileName, areas: parsedAreas }]
  }

  function removeFile(id: string): void {
    files.value = files.value.filter((f) => f.id !== id)
  }

  function clear(): void {
    files.value = []
  }

  return { files, areas, hasAreas, ingest, removeFile, clear }
})
