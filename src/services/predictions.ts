import type { ForecastNAM } from '@/types/Forecast'
import { api } from './api'
import type { StationPrediction } from '@/types/Predictions'

type HistoricalPredictionsResponse = {
  predictions: StationPrediction[]
}

export async function getHistoricalPredictionsService(
  stationId: string,
  startDate: string,
  endDate: string
): Promise<StationPrediction[]> {
  console.log('API URL runtime:', import.meta.env.VITE_API_URL)

  const res = await api
    .get(`predictions/forecast`, {
      searchParams: {
        stationId,
      },
      headers: {
        Accept: 'application/json',
      },
    })
    .json<HistoricalPredictionsResponse>()

  return res.predictions
}
