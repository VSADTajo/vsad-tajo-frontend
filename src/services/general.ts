import type { SearchResponse, SearchResult } from '@/types/Search'
import type { StationData, StationsApiResponse } from '@/utils/stationsToGeoJSON'
import { api } from './api'

export type StationsSearchParams =
  | { sistemaName: string }
  | { subBasinName: string }
  | { comarcaName: string }
  | { zonaExplOgcFid: string }

export async function getStationsByAreaService(
  params: StationsSearchParams
): Promise<StationData[]> {
  const response = await api
    .get('stations', { searchParams: params as Record<string, string> })
    .json<StationsApiResponse>()
  return Array.isArray(response.items) ? response.items : []
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
