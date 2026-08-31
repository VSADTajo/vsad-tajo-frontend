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

export type UploadScenarioFilesResult = {
  uploaded: ScenarioFile[]
  failedFileNames: string[]
}

// One request per file rather than bundling all of them into a single
// multipart POST — a batch of 9-10 files (some several MB each) in one
// request was either exceeding the backend's body-size limit or the 30s
// default timeout; each file on its own mirrors the single-file case that
// already works reliably, and gets a longer timeout since transferring a
// large file can legitimately take a while.
//
// Each file is attempted independently (not aborted by an earlier
// failure) — the scenario itself already exists by the time this runs, so
// stopping partway used to both under-report what actually got uploaded
// and leave the remaining files never even attempted.
export async function uploadScenarioFilesService(
  id: string,
  files: File[]
): Promise<UploadScenarioFilesResult> {
  const uploaded: ScenarioFile[] = []
  const failedFileNames: string[] = []

  for (const file of files) {
    const formData = new FormData()
    formData.append('files', file)

    try {
      // A non-2xx status (or a network failure) throws here — that's the
      // only case that means the file genuinely didn't upload.
      const response = await api.post(`scenarios/${encodeURIComponent(id)}/files`, {
        body: formData,
        timeout: 120000,
      })

      try {
        // The "1..N files" endpoint returns an array in bulk, but a single
        // file may come back as one bare object instead — a response.json()
        // parse failure here (or an unexpected shape) doesn't mean the
        // upload failed, just that we can't read back this file's metadata.
        const result = await response.json<ScenarioFile[] | ScenarioFile>()
        uploaded.push(...(Array.isArray(result) ? result : [result]))
      } catch {
        // Upload succeeded (response.ok) — nothing to add to `uploaded`.
      }
    } catch {
      failedFileNames.push(file.name)
    }
  }

  return { uploaded, failedFileNames }
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
