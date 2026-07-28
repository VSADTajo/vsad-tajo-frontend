import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LocalFileStation } from '@/types/LocalStationsFile'
import { isLocalStationsFileResponse } from '@/types/LocalStationsFile'

export const useLocalFileStore = defineStore('localFile', () => {
  const fileName = ref<string | null>(null)
  const stations = ref<LocalFileStation[]>([])
  const error = ref<string | null>(null)
  const selectedStationCode = ref<string | null>(null)

  const hasStations = computed(() => stations.value.length > 0)

  const validStationCount = computed(
    () =>
      stations.value.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
        .length
  )

  async function loadFromFile(file: File): Promise<void> {
    error.value = null

    let parsed: unknown
    try {
      const text = await file.text()
      parsed = JSON.parse(text)
    } catch {
      error.value = 'El archivo no es un JSON válido.'
      return
    }

    if (!isLocalStationsFileResponse(parsed)) {
      error.value =
        'El archivo no tiene el formato esperado: se requiere un objeto { items: [...] }.'
      return
    }

    fileName.value = file.name
    stations.value = parsed.items
    selectedStationCode.value = null
  }

  function clear(): void {
    fileName.value = null
    stations.value = []
    error.value = null
    selectedStationCode.value = null
  }

  function selectStation(stationCode: string | null): void {
    selectedStationCode.value = stationCode
  }

  return {
    fileName,
    stations,
    error,
    selectedStationCode,
    hasStations,
    validStationCount,
    loadFromFile,
    clear,
    selectStation,
  }
})
