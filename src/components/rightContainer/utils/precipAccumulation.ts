import type { StationPrediction } from '@/types/Predictions'

export const PRECIP_HORIZON_HOURS = [0, 0.25, 1, 2, 4, 8, 12, 24] as const

export type PrecipHorizonKey = 'h0' | 'h15m' | 'h1' | 'h2' | 'h4' | 'h8' | 'h12' | 'h24'

export type HorizonValues = Record<PrecipHorizonKey, number | null>

export const PRECIP_HORIZON_META: Array<{ key: PrecipHorizonKey; label: string; hours: number }> = [
  { key: 'h0', label: '0', hours: 0 },
  { key: 'h15m', label: '+15m', hours: 0.25 },
  { key: 'h1', label: '+1h', hours: 1 },
  { key: 'h2', label: '+2h', hours: 2 },
  { key: 'h4', label: '+4h', hours: 4 },
  { key: 'h8', label: '+8h', hours: 8 },
  { key: 'h12', label: '+12h', hours: 12 },
  { key: 'h24', label: '+24h', hours: 24 },
]

export function emptyHorizons(): HorizonValues {
  return {
    h0: 0,
    h15m: null,
    h1: null,
    h2: null,
    h4: null,
    h8: null,
    h12: null,
    h24: null,
  }
}

export function extractAccumulatedHorizonValues(prediction?: StationPrediction): HorizonValues {
  const result = emptyHorizons()
  if (!prediction?.results?.length) return result

  const orderedResults = prediction.results
    .map((entry) => ({
      timestamp: new Date(entry.date).getTime(),
      value: Number(entry.value),
    }))
    .filter((entry) => Number.isFinite(entry.timestamp) && Number.isFinite(entry.value))
    .sort((a, b) => a.timestamp - b.timestamp)

  if (!orderedResults.length) return result

  const startTimestamp = orderedResults[0].timestamp

  for (const horizon of PRECIP_HORIZON_META) {
    if (horizon.hours === 0) {
      result[horizon.key] = 0
      continue
    }

    const targetMs = startTimestamp + horizon.hours * 60 * 60 * 1000
    const accumulated = orderedResults
      .filter((entry) => entry.timestamp <= targetMs)
      .reduce((sum, entry) => sum + entry.value, 0)

    result[horizon.key] = Number.isFinite(accumulated) ? accumulated : null
  }

  return result
}
