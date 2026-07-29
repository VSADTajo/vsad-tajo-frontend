import { api } from './api'
import type { ArealPrecipResponse } from '@/types/ArealPrecipitation'

export type ArealPrecipProvider = 'ens' | 'harmonie' | 'obs'

export async function getArealPrecipitationService(
  locationId: string,
  provider: ArealPrecipProvider,
  fromForecastDate: string,
  toForecastDate: string,
  accumulation = '1h'
): Promise<ArealPrecipResponse> {
  return api
    .get(`aerial-precipitation/by-location/${encodeURIComponent(locationId)}`, {
      searchParams: {
        includeEvents: true,
        fromForecastDate,
        toForecastDate,
        accumulation,
        provider,
      },
      headers: {
        Accept: 'application/json',
      },
    })
    .json<ArealPrecipResponse>()
}
