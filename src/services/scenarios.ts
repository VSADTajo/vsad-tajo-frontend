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

// One request per file rather than bundling all of them into a single
// multipart POST — a batch of 9-10 files (some several MB each) in one
// request was either exceeding the backend's body-size limit or the 30s
// default timeout; each file on its own mirrors the single-file case that
// already works reliably, and gets a longer timeout since transferring a
// large file can legitimately take a while.
export async function uploadScenarioFilesService(
  id: string,
  files: File[]
): Promise<ScenarioFile[]> {
  const uploaded: ScenarioFile[] = []

  for (const file of files) {
    const formData = new FormData()
    formData.append('files', file)

    const result = await api
      .post(`scenarios/${encodeURIComponent(id)}/files`, { body: formData, timeout: 120000 })
      .json<ScenarioFile[]>()

    uploaded.push(...result)
  }

  return uploaded
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
      timeout: 120000,
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
    .get(
      `scenarios/${encodeURIComponent(scenarioId)}/files/${encodeURIComponent(fileId)}/download`,
      { timeout: 120000 }
    )
    .blob()
}
