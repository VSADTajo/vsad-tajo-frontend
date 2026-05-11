import { api } from './api'
import type {
  AvailableDateItem,
  DatesAvailableResponse,
  HistoricalPredictionTypeName,
  MaxLatestValuesResponse,
  PredictionsResponse,
  PredictionTypeName,
  StationMaxLatestValue,
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

export async function getAvailablePredictionsService(
  station: string,
  predictionType?: PredictionTypeName
): Promise<DatesAvailableResponse> {
  const result = await api
    .get('predictions/available-dates', {
      searchParams: {
        stationId: station,
        predictionType,
      },
      headers: {
        Accept: 'application/json',
      },
    })
    .json<DatesAvailableResponse | AvailableDateItem[]>()

  // Normalize backend variants to a single object shape.
  if (Array.isArray(result)) {
    return {
      simulationDates: result,
      totalResults: result.length,
    }
  }

  if (Array.isArray(result.simulationDates)) {
    return {
      simulationDates: result.simulationDates,
      totalResults: result.totalResults,
      dates: result.dates,
    }
  }

  if (Array.isArray(result.dates)) {
    return {
      dates: result.dates,
      simulationDates: result.dates.map((simulationDate) => ({ simulationDate })),
      totalResults: result.totalResults ?? result.dates.length,
    }
  }

  return {
    simulationDates: [],
    totalResults: 0,
  }
}

export async function getHistoricalPredictionService(
  stationId: string,
  predictionType: HistoricalPredictionTypeName,
  startDate?: string,
  endDate?: string
): Promise<StationPrediction | undefined> {
  const res = await api
    .get(`predictions/historical`, {
      searchParams: {
        stationId,
        predictionType,
        startDate,
        endDate,
      },
      headers: {
        Accept: 'application/json',
      },
    })
    .json<PredictionsResponse>()

  return res.predictions[0]
}

export async function getMaxAndLatestValuesService(
  typeName: 'Q.NAM.harmonie' | 'I.NAM.harmonie' | 'P.harmonie.forecast'
): Promise<StationMaxLatestValue[]> {
  const response = await api
    .get('predictions/max-and-latest-values', {
      searchParams: { typeName },
      headers: {
        Accept: 'application/json',
      },
    })
    .json<MaxLatestValuesResponse>()

  return Array.isArray(response.values) ? response.values : []
}
