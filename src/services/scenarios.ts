import { api } from './api'
import type {
  CreateScenarioPayload,
  Scenario,
  ScenarioFile,
  ScenarioListResponse,
  ScenarioSummary,
} from '@/types/Scenarios'

export async function getScenariosService(): Promise<ScenarioSummary[]> {
  const result = await api.get('scenarios').json<ScenarioListResponse>()
  return result.items
}

export async function createScenarioService(payload: CreateScenarioPayload): Promise<Scenario> {
  return api.post('scenarios', { json: payload }).json<Scenario>()
}

export async function getScenarioService(id: string): Promise<Scenario> {
  return api.get(`scenarios/${encodeURIComponent(id)}`).json<Scenario>()
}

export async function deleteScenarioService(id: string): Promise<void> {
  await api.delete(`scenarios/${encodeURIComponent(id)}`).json()
}

export async function uploadScenarioFilesService(
  id: string,
  files: File[]
): Promise<ScenarioFile[]> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }

  return api
    .post(`scenarios/${encodeURIComponent(id)}/files`, { body: formData })
    .json<ScenarioFile[]>()
}

export async function replaceScenarioFileService(
  scenarioId: string,
  fileId: string,
  file: File
): Promise<ScenarioFile> {
  const formData = new FormData()
  formData.append('file', file)

  return api
    .patch(`scenarios/${encodeURIComponent(scenarioId)}/files/${encodeURIComponent(fileId)}`, {
      body: formData,
    })
    .json<ScenarioFile>()
}

export async function deleteScenarioFileService(scenarioId: string, fileId: string): Promise<void> {
  await api
    .delete(`scenarios/${encodeURIComponent(scenarioId)}/files/${encodeURIComponent(fileId)}`)
    .json()
}

export async function downloadScenarioFileService(
  scenarioId: string,
  fileId: string
): Promise<Blob> {
  return api
    .get(`scenarios/${encodeURIComponent(scenarioId)}/files/${encodeURIComponent(fileId)}/download`)
    .blob()
}
