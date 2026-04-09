import type { SearchResponse, SearchResult } from '@/types/Search'
import { api } from './api'

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
