export type SimulationOperation = {
  caudalSalida: number
  fechaInicio: Date
  fechaFin: Date
  stationCode: string
  stationName: string
}

export type SimulationStatus = 'disponible' | 'pendiente' | 'erronea'

export type SimulationRecord = {
  id: string
  createdAt: Date
  operations: SimulationOperation[]
  status: SimulationStatus
}