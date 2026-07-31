import type { StationData } from '@/utils/stationsToGeoJSON'
import type { DataStationPrediction } from '@/types/Predictions'

export interface LocalFileStation extends StationData {
  // Kept separate because the same physical station can carry both kinds of
  // data (e.g. locationId "AR01" for caudal and "AR01P" for its precipitation
  // sensor, merged into one station) — a single shared object would have
  // caudal and precipitación series overwrite each other on keys like
  // forecastHarmonie/forecastEpsat.
  predictionsCaudal?: DataStationPrediction
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
