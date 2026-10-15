import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/services/api'
import type { StationsApiResponse } from '@/utils/stationsToGeoJSON'

export type StationModelAvailability = {
  hasCaudalNam: boolean
  hasCaudalMike: boolean
}

// Frontend-only cache of the hasCaudalNam/hasCaudalMike flags the map's
// SAIH layer already fetches from GET /stations — reused here (e.g. by the
// TopBar search autocomplete) so other UI can tell whether a station is
// currently hidden on the map by the active Caudal NAM/MIKE model filter,
// without a dedicated backend endpoint for it.
export const useStationAvailabilityStore = defineStore('stationAvailability', () => {
  const byCode = ref(new Map<string, StationModelAvailability>())
  const loaded = ref(false)
  let loadingPromise: Promise<void> | null = null

  async function ensureLoaded(): Promise<void> {
    if (loaded.value) return
    if (loadingPromise) {
      await loadingPromise
      return
    }

    loadingPromise = api
      .get('stations')
      .json<StationsApiResponse>()
      .then((response) => {
        const map = new Map<string, StationModelAvailability>()

        for (const station of response.items ?? []) {
          const code = String(station.stationCode ?? '').toUpperCase()
          if (!code) continue

          map.set(code, {
            hasCaudalNam: station.hasCaudalNam !== false,
            hasCaudalMike: station.hasCaudalMike !== false,
          })
        }

        byCode.value = map
        loaded.value = true
      })
      .catch((error) => {
        console.error('Error loading station model availability', error)
      })
      .finally(() => {
        loadingPromise = null
      })

    await loadingPromise
  }

  function getAvailability(code: string): StationModelAvailability | undefined {
    return byCode.value.get(code.toUpperCase())
  }

  return { loaded, ensureLoaded, getAvailability }
})
