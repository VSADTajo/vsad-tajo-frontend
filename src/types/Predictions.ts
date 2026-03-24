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
