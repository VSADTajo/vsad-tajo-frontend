export type ScenarioSummary = {
  id: string
  name: string
  description: string | null
  itemsCount: number
  sizeBytes: number
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

export type ScenarioListResponse = {
  items: ScenarioSummary[]
  total: number
}

export type Scenario = ScenarioSummary & {
  payload: unknown
  files: ScenarioFile[]
}

export type CreateScenarioPayload = {
  name: string
  description?: string
  payload: unknown
}

export type ScenarioFile = {
  id: string
  scenarioId: string
  filename: string
  contentType: string
  sizeBytes: number
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}
