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

export type HistoricalPredictionTypeName = 'Q.historical' | 'Precip.historical'

export type PredictionsResponse = {
  predictions: StationPrediction[]
}

export type DatesAvailableResponse = {
  dates: string[]
}

// Series para el gráfico
export type RangePoint = { x: string; y: [number | null, number | null] | null }
export type Point = { x: string; y: number | null }
export type SeriesItem = {
  name: string
  type?: string
  data: Array<Point | RangePoint | number | null>
}
