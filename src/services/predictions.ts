import { api } from './api'
import type {
  AvailableDateItem,
  DatesAvailableResponse,
  HistoricalPredictionTypeName,
  HistoricalTimelineResponse,
  MaxLatestValuesResponse,
  PrecipAccumulatedHours,
  PrecipAccumulatedResponse,
  PrecipAccumulatedSource,
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
  startDate: string,
  endDate: string
): Promise<StationPrediction | undefined> {
  const response = await api
    .get('predictions/historical', {
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
    .json<HistoricalTimelineResponse>()

  if (!response.results.length) return undefined

  return {
    id: `historical-${response.stationId}-${response.predictionType}`,
    stationId: response.stationId,
    stationName: '',
    predictionTypeName: response.predictionType,
    simulationDate: '',
    predictionDate: '',
    predictionProvider: '',
    predictedBy: '',
    results: response.results.map((point, index) => ({
      id: index,
      date: point.date,
      value: point.value,
      flag: point.flag,
    })),
  }
}

// Precipitación no longer uses this (see getPrecipAccumulatedService below)
// — only caudal types remain.
export async function getMaxAndLatestValuesService(
  typeName:
    | 'Q.NAM.harmonie'
    | 'Q.NAM.ens'
    | 'I.NAM.harmonie'
    | 'I.nam.ens'
    | 'FICT98.historical'
    | 'FICT99.historical'
    | 'Q.mk11.forecast'
    | 'I.mk11.forecast'
    | 'Q.mk11.EPSforecast'
    | 'I.mk11.EPSforecast'
): Promise<StationMaxLatestValue[]> {
  const response = await api
    .get('predictions/max-and-latest-values', {
      searchParams: { typeName },
      retry: {
        limit: 0,
      },
      headers: {
        Accept: 'application/json',
      },
    })
    .json<MaxLatestValuesResponse>()

  return Array.isArray(response.values) ? response.values : []
}

export async function getPrecipAccumulatedService(
  source: PrecipAccumulatedSource,
  hours: PrecipAccumulatedHours
): Promise<PrecipAccumulatedResponse> {
  return api
    .get('predictions/precip-accumulated', {
      searchParams: { source, hours },
      retry: {
        limit: 0,
      },
      headers: {
        Accept: 'application/json',
      },
    })
    .json<PrecipAccumulatedResponse>()
}
