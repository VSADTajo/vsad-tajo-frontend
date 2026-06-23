import { computed, ref, watch, type ComputedRef } from 'vue'
import type { StationPrediction } from '@/types/Predictions'
import type { ResguardosStationResponse } from '@/types/Resguardos'
import { getResguardosByStationService } from '@/services/resguardos'

export function useResguardos(
  normalizedStationCode: ComputedRef<string>,
  isEmbalse: ComputedRef<boolean | undefined>
) {
  const resguardosApiData = ref<ResguardosStationResponse>()
  const loadingResguardos = ref(false)
  const editedResguardoPrediction = ref<StationPrediction>()
  const editedMinimoPrediction = ref<StationPrediction>()

  function toStationPredictionFromResguardos(
    kind: 'reserveVolume' | 'minimumVolume',
    predictionTypeName: string
  ): StationPrediction | undefined {
    const payload = resguardosApiData.value
    if (!payload) return undefined

    const entries = Object.entries(payload.entries)
      .map(([date, entry]) => {
        const parsedTime = Date.parse(`${date}T00:00:00`)
        if (!Number.isFinite(parsedTime)) return null
        return {
          date,
          time: parsedTime,
          value: kind === 'reserveVolume' ? entry.reserveVolume : entry.minimumVolume,
        }
      })
      .filter((item): item is { date: string; time: number; value: number | null } => item !== null)
      .sort((a, b) => a.time - b.time)

    const results = entries.flatMap((entry, index) => {
      const numericValue = Number(entry.value)
      if (!Number.isFinite(numericValue)) return []
      const startIso = new Date(`${entry.date}T00:00:00`).toISOString()
      const endIso = new Date(`${entry.date}T23:59:59`).toISOString()
      return [
        { id: index * 2 + 1, date: startIso, value: numericValue, flag: 0 },
        { id: index * 2 + 2, date: endIso, value: numericValue, flag: 0 },
      ]
    })

    if (!results.length) return undefined

    return {
      id: `${predictionTypeName}-${payload.stationCode}`,
      stationId: payload.stationCode,
      stationName: payload.stationName,
      predictionTypeName,
      simulationDate: results[0].date,
      predictionDate: new Date().toISOString(),
      predictionProvider: 'resguardos-api',
      predictedBy: 'api',
      results,
    }
  }

  const resguardoFromApi = computed<StationPrediction | undefined>(() =>
    toStationPredictionFromResguardos('reserveVolume', 'resguardo.hydrologicalYear')
  )

  const minimoFromApi = computed<StationPrediction | undefined>(() =>
    toStationPredictionFromResguardos('minimumVolume', 'volumen.minimo.hydrologicalYear')
  )

  const effectiveResguardoPrediction = computed(
    () => editedResguardoPrediction.value ?? resguardoFromApi.value
  )
  const effectiveMinimoPrediction = computed(
    () => editedMinimoPrediction.value ?? minimoFromApi.value
  )

  let resguardosRequestId = 0

  watch(
    [isEmbalse, normalizedStationCode],
    async ([isEmbalseStation, stationCode]) => {
      resguardosApiData.value = undefined

      if (!isEmbalseStation || !stationCode) return

      const requestId = ++resguardosRequestId
      loadingResguardos.value = true

      try {
        const response = await getResguardosByStationService(stationCode)
        if (requestId !== resguardosRequestId) return
        resguardosApiData.value = response
      } catch (error) {
        if (requestId !== resguardosRequestId) return
        resguardosApiData.value = undefined
        console.error('Error loading resguardos data:', error)
      } finally {
        if (requestId === resguardosRequestId) loadingResguardos.value = false
      }
    },
    { immediate: true }
  )

  return {
    resguardosApiData,
    loadingResguardos,
    effectiveResguardoPrediction,
    effectiveMinimoPrediction,
    editedResguardoPrediction,
    editedMinimoPrediction,
  }
}
