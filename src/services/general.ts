import type { SearchResponse, SearchResult } from '@/types/Search'
import type { StationData, StationsApiResponse } from '@/utils/stationsToGeoJSON'
import type { SimulationRecord } from '@/types/Simulations'
import { api } from './api'

export type StationsSearchParams =
  | { sistemaName: string }
  | { subBasinName: string }
  | { comarcaName: string }
  | { zonaExplOgcFid: string }

type PaginatedStationsResponse = {
  items: StationData[]
  total?: number
  page?: number
  limit?: number
}

export async function getEmbalseStationsService(): Promise<StationByCodeResponse[]> {
  const PAGE_SIZE = 200
  const all: StationData[] = []
  let page = 1

  while (true) {
    const res = await api
      .get('stations', {
        searchParams: { stationType: 'EMBALSE_SAIH', limit: PAGE_SIZE, page },
      })
      .json<PaginatedStationsResponse>()

    all.push(...res.items)

    if (res.items.length < PAGE_SIZE) break
    page++
  }

  return all as StationByCodeResponse[]
}

export type StationByCodeResponse = {
  id: string
  name: string
  stationCode: string
  stationType: string
  tipoCod?: string | null
  latitude: number | null
  longitude: number | null
  threshold?: {
    umbralNivel1?: number | null
    umbralNivel2?: number | null
    umbralNivel3?: number | null
    umbralCaudal1?: number | null
    umbralCaudal2?: number | null
    umbralCaudal3?: number | null
    umbralVolumen1?: number | null
    umbralVolumen2?: number | null
    umbralVolumen3?: number | null
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

export async function getStationsByAreaService(
  params: StationsSearchParams
): Promise<StationData[]> {
  const response = await api
    .get('stations', { searchParams: params as Record<string, string> })
    .json<StationsApiResponse>()
  return Array.isArray(response.items) ? response.items : []
}

export async function getStationByCodeService(code: string): Promise<StationByCodeResponse> {
  return api.get(`stations/by-code/${encodeURIComponent(code)}`).json<StationByCodeResponse>()
}

type DownstreamStation = {
  codigoDestino: string
  nombreDestino: string
  tipoDestino: string
}

export async function getDownstreamStationsService(codes: string[]): Promise<string[]> {
  if (!codes.length) return []
  const params = new URLSearchParams()
  codes.forEach((code) => params.append('codes', code))
  const result = await api
    .get('stations/downstream', { searchParams: params })
    .json<{ items: DownstreamStation[]; count: number }>()
  return result.items.map((s) => s.codigoDestino)
}

type CreateSimulationPayload = {
  modmeteo: 'BOTH'
  maneuvers: { reservoirCode: string; outputFlowValue: number; startDate: string; endDate: string }[]
}

export type CreateSimulationResponse = {
  id: string
  [key: string]: unknown
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
  await api.delete(`simulations/manual/${encodeURIComponent(id)}`).json()
}

type UpdateManeuverPayload = { id: string; startDate: string | null; endDate: string | null }

export async function updateSimulationService(
  id: string,
  maneuvers: UpdateManeuverPayload[]
): Promise<void> {
  await api.patch(`simulations/manual/${encodeURIComponent(id)}`, { json: { maneuvers } }).json()
}

export async function searchService(query: string): Promise<SearchResult[]> {
  const result = await api
    .get(`search`, {
      searchParams: { q: query },
      headers: {
        Accept: 'application/json',
      },
    })
    .json<SearchResponse>()

  return result.results
}
