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
