import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import type { LocalFileStation } from '@/types/LocalStationsFile'
import { isLocalStationsFileResponse } from '@/types/LocalStationsFile'

function hasValidCoordinates(station: LocalFileStation): boolean {
  return Number.isFinite(station.latitude) && Number.isFinite(station.longitude)
}

function hasPredictions(station: LocalFileStation): boolean {
  const predictions = station.predictions
  if (!predictions) return false
  return Object.values(predictions).some((p) => (p?.results?.length ?? 0) > 0)
}

export const useLocalFileStore = defineStore('localFile', () => {
  // Persisted to localStorage so a reload / new session on the same browser
  // keeps showing the last file loaded, without needing to re-upload it.
  const fileName = useStorage<string | null>('localFile:fileName', null)
  const stations = useStorage<LocalFileStation[]>('localFile:stations', [])
  const error = ref<string | null>(null)
  const selectedStationCode = ref<string | null>(null)

  const hasStations = computed(() => stations.value.length > 0)

  // Only stations carrying predictions are shown on the map / panel list —
  // a station without predictions has nothing useful to display.
  const stationsWithPredictions = computed(() => stations.value.filter(hasPredictions))

  const validStationCount = computed(
    () => stationsWithPredictions.value.filter(hasValidCoordinates).length
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
    stationsWithPredictions,
    validStationCount,
    loadFromFile,
    clear,
    selectStation,
  }
})
