import { api } from './api'
import type {
  DatesAvailableResponse,
  PredictionsResponse,
  PredictionTypeName,
  StationPrediction,
} from '@/types/Predictions'

export async function getPredictionsService(
  stationId: string,
  predictionType: PredictionTypeName,
  simulationDate?: string,
  percentile?: string
): Promise<StationPrediction | undefined> {
  const res = await api
    .get(`predictions/forecast`, {
      searchParams: {
        stationId,
        predictionType,
        simulationDate,
        percentile,
      },
      headers: {
        Accept: 'application/json',
      },
    })
    .json<PredictionsResponse>()

  return res.predictions[0]
}

export async function getAvailablePredictionsService(): Promise<string[]> {
  const result = await api
    .get(`predictions/available-dates`, {
      headers: {
        Accept: 'application/json',
      },
    })
    .json<DatesAvailableResponse>()

  return result.dates
}
