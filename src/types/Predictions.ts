export interface DataStationPrediction {
  historical?: StationPrediction
  forecastHarmonie?: StationPrediction
  forecastEpsat?: StationPrediction
  forecastEnsP10?: StationPrediction
  forecastEnsP25?: StationPrediction
  forecastEnsP90?: StationPrediction
  forecastEnsP75?: StationPrediction
}

export interface PredictionResult {
  id: number
  date: string
  value: number
  flag: number
}

export interface StationPrediction {
  id: string
  stationId: string
  stationName: string
  predictionTypeName: string
  simulationDate: string
  predictionDate: string
  percentile?: string
  predictionProvider: string
  predictedBy: string
  results: PredictionResult[]
}

export type PredictionTypeName =
  | 'P.ens.forecast'
  | 'P.harmonie.forecast'
  | 'Q.NAM.harmonie'
  | 'I.NAM.harmonie'
  | 'Q.NAM.ens'
  | 'I.NAM.ens.medio'
  | 'I.NAM.ens'
  | 'WI__01.historical'
  | 'LI__01.historical'
  | 'LICT01.historical'
  | 'FICT98.historical'
  | 'FICT99.historical'
  | 'FICT95.historical'
  | 'VICT01.historical'
  | 'Q.mk11.forecast'
  | 'Q.mk11.EPSforecast'
  | 'Q.mk11.EPS25forecast'
  | 'Q.mk11.EPS75forecast'
  | 'I.mk11.forecast'
  | 'I.mk11.EPSforecast'
  | 'I.mk11.EPS25forecast'
  | 'I.mk11.EPS75forecast'
  | 'V.MIKE11.harmonie_acum'
  | 'V.MIKE11.ens.medio_acum'
  | 'V.MIKE11.25.medio_acum'
  | 'V.MIKE11.75.medio_acum'

export type HistoricalPredictionTypeName = string

export interface HistoricalTimelinePoint {
  date: string
  value: number
  flag: number
}

export interface HistoricalTimelineResponse {
  stationId: string
  predictionType: string
  results: HistoricalTimelinePoint[]
}

export type PredictionsResponse = {
  predictions: StationPrediction[]
}

export type AvailableDateItem = {
  simulationDate: string
  modmeteo?: string
  status?: string
  predictionTypes?: string[]
}

export type DatesAvailableResponse = {
  dates?: string[]
  simulationDates: AvailableDateItem[]
  totalResults?: number
}

export type StationMaxLatestValue = {
  stationId: string
  stationName: string
  maxValue: number
  latestValue: number
  latestDate: string
  predictionTypeName: string
  maxDate: string
  simulationDate: string
}

export type MaxLatestValuesResponse = {
  values: StationMaxLatestValue[]
}

// Series para el gráfico
export type RangePoint = { x: string; y: [number | null, number | null] | null }
export type Point = { x: string; y: number | null }
export type SeriesItem = {
  name: string
  type?: string
  yAxisIndex?: number
  data: Array<Point | RangePoint | number | null>
}
