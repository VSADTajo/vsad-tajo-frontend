import type { StationData } from '@/utils/stationsToGeoJSON'
import type { DataStationPrediction } from '@/types/Predictions'

export interface LocalFileStation extends StationData {
  // Kept separate because the same physical station can carry more than one
  // kind of data at once (e.g. an embalse with both caudal/nivel and
  // volumen, or "AR01" caudal + "AR01P" precipitación merged into one
  // station) — a single shared object would have them overwrite each other
  // on keys like forecastHarmonie/forecastEpsat, same as the live app keeps
  // caudal and volumen in separate composables/refs.
  predictionsCaudal?: DataStationPrediction
  predictionsVolumen?: DataStationPrediction
  predictionsPrecipitacion?: DataStationPrediction
}

export interface LocalStationsFileResponse {
  items: LocalFileStation[]
}

export function isLocalStationsFileResponse(value: unknown): value is LocalStationsFileResponse {
  if (!value || typeof value !== 'object') return false
  const items = (value as { items?: unknown }).items
  return Array.isArray(items)
}
