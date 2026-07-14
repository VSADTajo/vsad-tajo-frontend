import { api } from './api'
import type { SimulationResultsResponse } from '@/types/Simulations'

export async function getSimulationResultsService(id: string): Promise<SimulationResultsResponse> {
  return api.get(`simulations/manual/${id}/results`).json<SimulationResultsResponse>()
}
