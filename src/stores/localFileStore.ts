import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import type { LocalFileStation } from '@/types/LocalStationsFile'
import { isLocalStationsFileResponse } from '@/types/LocalStationsFile'
import { isFewsPiFile } from '@/types/FewsPiFile'
import { fewsPiFileToStations } from '@/utils/parseFewsPiFile'
import type { DataStationPrediction } from '@/types/Predictions'

export interface LoadedLocalFile {
  id: string
  fileName: string
  stations: LocalFileStation[]
}

function hasValidCoordinates(station: LocalFileStation): boolean {
  return Number.isFinite(station.latitude) && Number.isFinite(station.longitude)
}

// A series with every event masked out as missVal (e.g. an EPS run that
// never produced valid data for that station) still has a prediction slot —
// it should keep the station visible with an empty chart, not hide it.
function hasPredictions(station: LocalFileStation): boolean {
  return (
    Object.keys(station.predictionsCaudal ?? {}).length > 0 ||
    Object.keys(station.predictionsPrecipitacion ?? {}).length > 0
  )
}

function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Different files can each bring one variable (harmonie precip, eps precip,
// caudal, ...) for the same set of stations. Merge them by stationCode so a
// station shows up once on the map with every prediction it has, instead of
// once per file.
function mergeStationsByCode(files: LoadedLocalFile[]): LocalFileStation[] {
  const byCode = new Map<string, LocalFileStation>()

  for (const file of files) {
    for (const station of file.stations) {
      const existing = byCode.get(station.stationCode)

      if (!existing) {
        byCode.set(station.stationCode, {
          ...station,
          predictionsCaudal: { ...station.predictionsCaudal },
          predictionsPrecipitacion: { ...station.predictionsPrecipitacion },
        })
        continue
      }

      existing.predictionsCaudal = {
        ...existing.predictionsCaudal,
        ...station.predictionsCaudal,
      } as DataStationPrediction

      existing.predictionsPrecipitacion = {
        ...existing.predictionsPrecipitacion,
        ...station.predictionsPrecipitacion,
      } as DataStationPrediction

      if (existing.latitude == null && station.latitude != null) {
        existing.latitude = station.latitude
      }
      if (existing.longitude == null && station.longitude != null) {
        existing.longitude = station.longitude
      }
    }
  }

  return [...byCode.values()]
}

export const useLocalFileStore = defineStore('localFile', () => {
  // Persisted to localStorage so a reload / new session on the same browser
  // keeps showing the last files loaded, without needing to re-upload them.
  const files = useStorage<LoadedLocalFile[]>('localFile:files', [])
  const error = ref<string | null>(null)
  const selectedStationCode = ref<string | null>(null)

  const stations = computed<LocalFileStation[]>(() => mergeStationsByCode(files.value))

  const hasStations = computed(() => files.value.length > 0)

  // Only stations carrying predictions are shown on the map / panel list —
  // a station without predictions has nothing useful to display.
  const stationsWithPredictions = computed(() => stations.value.filter(hasPredictions))

  const validStationCount = computed(
    () => stationsWithPredictions.value.filter(hasValidCoordinates).length
  )

  async function loadFromFiles(fileList: File[]): Promise<void> {
    const errors: string[] = []
    const newFiles: LoadedLocalFile[] = []

    for (const file of fileList) {
      let parsed: unknown
      try {
        const text = await file.text()
        parsed = JSON.parse(text)
      } catch {
        errors.push(`"${file.name}" no es un JSON válido.`)
        continue
      }

      if (isFewsPiFile(parsed)) {
        newFiles.push({
          id: generateFileId(),
          fileName: file.name,
          stations: fewsPiFileToStations(parsed),
        })
        continue
      }

      if (isLocalStationsFileResponse(parsed)) {
        newFiles.push({ id: generateFileId(), fileName: file.name, stations: parsed.items })
        continue
      }

      errors.push(
        `"${file.name}" no tiene un formato reconocido (se esperaba un archivo FEWS con "timeSeries" o un objeto { items: [...] }).`
      )
    }

    if (newFiles.length > 0) {
      files.value = [...files.value, ...newFiles]
      selectedStationCode.value = null
    }

    error.value = errors.length > 0 ? errors.join(' ') : null
  }

  function removeFile(id: string): void {
    files.value = files.value.filter((f) => f.id !== id)
  }

  function clear(): void {
    files.value = []
    error.value = null
    selectedStationCode.value = null
  }

  function selectStation(stationCode: string | null): void {
    selectedStationCode.value = stationCode
  }

  return {
    files,
    stations,
    error,
    selectedStationCode,
    hasStations,
    stationsWithPredictions,
    validStationCount,
    loadFromFiles,
    removeFile,
    clear,
    selectStation,
  }
})
