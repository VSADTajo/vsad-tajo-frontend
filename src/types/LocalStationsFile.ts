import type { StationData } from '@/utils/stationsToGeoJSON'
import type { DataStationPrediction } from '@/types/Predictions'

export interface LocalFileStation extends StationData {
  predictions?: DataStationPrediction
}

export interface LocalStationsFileResponse {
  items: LocalFileStation[]
}

export function isLocalStationsFileResponse(value: unknown): value is LocalStationsFileResponse {
  if (!value || typeof value !== 'object') return false
  const items = (value as { items?: unknown }).items
  return Array.isArray(items)
}
