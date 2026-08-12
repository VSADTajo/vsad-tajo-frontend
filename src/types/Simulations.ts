export type SimulationResultPoint = {
  date: string
  value: number
  flag: number
}

export type SimulationResultPrediction = {
  id: string
  stationId: string
  stationName: string
  station?: {
    id: string
    name: string
    stationCode: string
    [key: string]: unknown
  }
  predictionTypeId: string
  predictionTypeName: string
  predictionTypeUnit: string
  percentile: number | null
  predictionProvider: string
  predictedBy: string
  predictionDate: string
  predictionStartDate: string
  predictionEndDate: string
  max: SimulationResultPoint
  last: SimulationResultPoint
  // Present only when the results call is made with withResults=true.
  results?: SimulationResultPoint[]
}

export type SimulationResultsResponse = {
  simulation: {
    id: string
    simulationDate: string
    status: SimulationStatus
    type: string
    dataOrigin: string
    createdAt: string
    updatedAt: string
  }
  predictions: SimulationResultPrediction[]
}

export type SimulationOperation = {
  caudalSalida: number
  fechaInicio: Date
  fechaFin: Date
  stationCode: string
  stationName: string
}

export type SimulationStatus = 'FINALIZED' | 'MODEL_PROCESSING' | 'MODEL_FAILED'

export type ApiSimulationManeuver = {
  id: string
  reservoirCode: string
  outputFlowValue: number
  startDate: string | null
  endDate: string | null
}

export type SimulationRecord = {
  id: string
  simulationDate: string
  status: SimulationStatus
  type: string
  description: string
  maneuverCount: number
  maneuvers: ApiSimulationManeuver[]
  createdAt: string
}

export type CreateSimulationPayload = {
  modmeteo: 'BOTH'
  description?: string
  maneuvers: {
    reservoirCode: string
    outputFlowValue: number
    startDate: string
    endDate: string
  }[]
}

export type CreateSimulationResponse = {
  id: string
  [key: string]: unknown
}

export type UpdateManeuverPayload = { id: string; startDate: string | null; endDate: string | null }
