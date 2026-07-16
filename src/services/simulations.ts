import { api } from './api'
import type {
  CreateSimulationPayload,
  CreateSimulationResponse,
  SimulationRecord,
  SimulationResultsResponse,
  UpdateManeuverPayload,
} from '@/types/Simulations'

export async function getSimulationResultsService(id: string): Promise<SimulationResultsResponse> {
  return api
    .get(`simulations/manual/${id}/results?withResults=false`)
    .json<SimulationResultsResponse>()
}

export async function createSimulationService(
  payload: CreateSimulationPayload
): Promise<CreateSimulationResponse> {
  return api.post('simulations/manual', { json: payload }).json<CreateSimulationResponse>()
}

export async function getSimulationsService(): Promise<SimulationRecord[]> {
  const result = await api.get('simulations/manual').json<{ data: SimulationRecord[] }>()
  return result.data
}

export async function deleteSimulationService(id: string): Promise<void> {
  await api.delete(`simulations/${encodeURIComponent(id)}`).json()
}

export async function updateSimulationService(
  id: string,
  maneuvers: UpdateManeuverPayload[]
): Promise<void> {
  await api.patch(`simulations/manual/${encodeURIComponent(id)}`, { json: { maneuvers } }).json()
}
