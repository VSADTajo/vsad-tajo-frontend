import { computed, ref, watch, type ComputedRef } from 'vue'
import type {
  DataStationPrediction,
  PredictionTypeName,
  StationPrediction,
} from '@/types/Predictions'
import {
  getAvailablePredictionsService,
  getHistoricalPredictionService,
  getPredictionsService,
} from '@/services/predictions'
import {
  applyForecastData,
  clearForecasts,
  fetchPredictionBatch,
  pickDefaultDate,
  toDateList,
  type ForecastRequestDef,
} from '@/components/rightContainer/utils/predictionTabUtils'

const HISTORICAL_RANGE_DAYS = 30

type ForecastKey = keyof DataStationPrediction
type ForecastRefsMap = Record<ForecastKey, { value: StationPrediction | undefined }>

export function useCaudalPredictions(
  normalizedStationCode: ComputedRef<string>,
  isEmbalse: ComputedRef<boolean | undefined>,
  codeType: ComputedRef<string | undefined>
) {
  // ── NAM refs ──────────────────────────────────────────────────────────────
  const caudalHistorical = ref<StationPrediction>()
  const caudalForecastHarmonie = ref<StationPrediction>()
  const caudalForecastEpstat = ref<StationPrediction>()
  const caudalForecastEnsP10 = ref<StationPrediction>()
  const caudalForecastEnsP25 = ref<StationPrediction>()
  const caudalForecastEnsP75 = ref<StationPrediction>()
  const caudalForecastEnsP90 = ref<StationPrediction>()
  const caudalOutflowHistorical = ref<StationPrediction>()
  const embalseVolumeHistorical = ref<StationPrediction>()

  // ── MIKE refs ─────────────────────────────────────────────────────────────
  const mikeForecastHarmonie = ref<StationPrediction>()
  const mikeForecastEpsat = ref<StationPrediction>()
  const mikeForecastEnsP25 = ref<StationPrediction>()
  const mikeForecastEnsP75 = ref<StationPrediction>()

  // ── MIKE volume refs (embalse only) ───────────────────────────────────────
  const mikeVolumeHarmonie = ref<StationPrediction>()
  const mikeVolumeEpsat = ref<StationPrediction>()
  const mikeVolumeEnsP25 = ref<StationPrediction>()
  const mikeVolumeEnsP75 = ref<StationPrediction>()

  // ── Refs maps (for bulk clear / apply) ───────────────────────────────────
  const caudalRefs: ForecastRefsMap = {
    historical: caudalHistorical,
    forecastHarmonie: caudalForecastHarmonie,
    forecastEpsat: caudalForecastEpstat,
    forecastEnsP10: caudalForecastEnsP10,
    forecastEnsP25: caudalForecastEnsP25,
    forecastEnsP75: caudalForecastEnsP75,
    forecastEnsP90: caudalForecastEnsP90,
  }

  const mikeRefs = {
    forecastHarmonie: mikeForecastHarmonie,
    forecastEpsat: mikeForecastEpsat,
    forecastEnsP25: mikeForecastEnsP25,
    forecastEnsP75: mikeForecastEnsP75,
  }

  const mikeVolumeRefs = {
    forecastHarmonie: mikeVolumeHarmonie,
    forecastEpsat: mikeVolumeEpsat,
    forecastEnsP25: mikeVolumeEnsP25,
    forecastEnsP75: mikeVolumeEnsP75,
  }

  // ── Dates ─────────────────────────────────────────────────────────────────
  const harmonieCaudalDates = ref<string[]>([])
  const harmoniePrecipDates = ref<string[]>([])
  const epsCaudalDates = ref<string[]>([])
  const epsPrecipDates = ref<string[]>([])
  const mikeDates = ref<string[]>([])

  // ── Selected dates ────────────────────────────────────────────────────────
  const selectedHarmonieCaudalDate = ref('')
  const selectedEpsCaudalDate = ref('')
  const selectedMikeDate = ref('')

  // ── Loading ───────────────────────────────────────────────────────────────
  const loading = ref(false)
  const loadingHarmoniePredict = ref(false)
  const loadingEpsPredict = ref(false)

  // ── NAM request definitions ───────────────────────────────────────────────
  const caudalRequestsByType = computed<Record<'default' | 'E', ForecastRequestDef[]>>(() => ({
    default: [
      {
        key: 'forecastHarmonie',
        predictionType: 'Q.NAM.harmonie',
        simulationDate: selectedHarmonieCaudalDate.value,
      },
      {
        key: 'forecastEpsat',
        predictionType: 'Q.NAM.ens',
        simulationDate: selectedEpsCaudalDate.value,
      },
      {
        key: 'forecastEnsP10',
        predictionType: 'Q.NAM.ens',
        simulationDate: selectedEpsCaudalDate.value,
        percentile: '10',
      },
      {
        key: 'forecastEnsP25',
        predictionType: 'Q.NAM.ens',
        simulationDate: selectedEpsCaudalDate.value,
        percentile: '25',
      },
      {
        key: 'forecastEnsP75',
        predictionType: 'Q.NAM.ens',
        simulationDate: selectedEpsCaudalDate.value,
        percentile: '75',
      },
      {
        key: 'forecastEnsP90',
        predictionType: 'Q.NAM.ens',
        simulationDate: selectedEpsCaudalDate.value,
        percentile: '90',
      },
    ],
    E: [
      {
        key: 'forecastHarmonie',
        predictionType: 'I.NAM.harmonie',
        simulationDate: selectedHarmonieCaudalDate.value,
      },
      {
        key: 'forecastEpsat',
        predictionType: 'I.NAM.ens.medio',
        simulationDate: selectedEpsCaudalDate.value,
      },
      {
        key: 'forecastEnsP10',
        predictionType: 'I.NAM.ens',
        simulationDate: selectedEpsCaudalDate.value,
        percentile: '10',
      },
      {
        key: 'forecastEnsP25',
        predictionType: 'I.NAM.ens',
        simulationDate: selectedEpsCaudalDate.value,
        percentile: '25',
      },
      {
        key: 'forecastEnsP75',
        predictionType: 'I.NAM.ens',
        simulationDate: selectedEpsCaudalDate.value,
        percentile: '75',
      },
      {
        key: 'forecastEnsP90',
        predictionType: 'I.NAM.ens',
        simulationDate: selectedEpsCaudalDate.value,
        percentile: '90',
      },
    ],
  }))

  // ── Chart data computeds ──────────────────────────────────────────────────
  // (resguardoVolume / minimumVolume are added by the caller after merging with useResguardos)
  const caudalBaseChartData = computed(() => ({
    historical: caudalHistorical.value,
    historicalOutflow: caudalOutflowHistorical.value,
    historicalVolume: embalseVolumeHistorical.value,
    forecastHarmonie: caudalForecastHarmonie.value,
    forecastEpsat: caudalForecastEpstat.value,
    forecastEnsP10: caudalForecastEnsP10.value,
    forecastEnsP25: caudalForecastEnsP25.value,
    forecastEnsP90: caudalForecastEnsP90.value,
    forecastEnsP75: caudalForecastEnsP75.value,
  }))

  const caudalOnlyBaseChartData = computed(() => ({
    historical: caudalHistorical.value,
    historicalOutflow: caudalOutflowHistorical.value,
    forecastHarmonie: caudalForecastHarmonie.value,
    forecastEpsat: caudalForecastEpstat.value,
    forecastEnsP10: caudalForecastEnsP10.value,
    forecastEnsP25: caudalForecastEnsP25.value,
    forecastEnsP90: caudalForecastEnsP90.value,
    forecastEnsP75: caudalForecastEnsP75.value,
  }))

  const volumenBaseChartData = computed(() => ({
    historicalVolume: embalseVolumeHistorical.value,
  }))

  const mikeChartData = computed(() => ({
    historical: caudalHistorical.value,
    historicalOutflow: caudalOutflowHistorical.value,
    forecastHarmonie: mikeForecastHarmonie.value,
    forecastEpsat: mikeForecastEpsat.value,
    forecastEnsP25: mikeForecastEnsP25.value,
    forecastEnsP75: mikeForecastEnsP75.value,
  }))

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  async function getAvailableDates(code: string) {
    const isEType = codeType.value === 'E'
    const harmonieCaudalType: PredictionTypeName = isEType ? 'I.NAM.harmonie' : 'Q.NAM.harmonie'
    const epsCaudalTypes: PredictionTypeName[] = isEType
      ? ['I.NAM.ens.medio', 'I.NAM.ens']
      : ['Q.NAM.ens']

    try {
      const [harmonieCaudalResponse, harmoniePrecipResponse, ...epsResponses] = await Promise.all([
        getAvailablePredictionsService(code, harmonieCaudalType),
        getAvailablePredictionsService(code, 'P.harmonie.forecast'),
        ...epsCaudalTypes.map((t) => getAvailablePredictionsService(code, t)),
      ])

      harmonieCaudalDates.value = toDateList(harmonieCaudalResponse)
      harmoniePrecipDates.value = toDateList(harmoniePrecipResponse)
      epsCaudalDates.value = Array.from(new Set(epsResponses.flatMap(toDateList))).sort((a, b) =>
        b.localeCompare(a)
      )
    } catch (err) {
      console.error('Error loading available dates:', err)
      harmonieCaudalDates.value = []
      harmoniePrecipDates.value = []
      epsCaudalDates.value = []
      epsPrecipDates.value = []
    }

    if (isEType) {
      try {
        const mikeResponse = await getAvailablePredictionsService(code, 'I.mk11.forecast')
        mikeDates.value = toDateList(mikeResponse)
      } catch {
        mikeDates.value = []
      }
    } else {
      try {
        const mikeResponse = await getAvailablePredictionsService(code, 'Q.mk11.forecast')
        mikeDates.value = toDateList(mikeResponse)
      } catch {
        mikeDates.value = []
      }
    }
  }

  let fetchRequestId = 0
  let isFullReloading = false
  let skipNextDateWatch = false

  async function refreshCaudalPredictions(requestId: number) {
    const code = normalizedStationCode.value
    if (!code) return

    const isEType = codeType.value === 'E'
    const historicalCaudalType: PredictionTypeName = isEType
      ? 'FICT99.historical'
      : 'FICT98.historical'

    const historicalEnd = new Date().toISOString()
    const historicalStart = new Date(
      Date.now() - HISTORICAL_RANGE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()

    try {
      const requests = isEType ? caudalRequestsByType.value.E : caudalRequestsByType.value.default

      const [caudalData, historicalData] = await Promise.all([
        fetchPredictionBatch(code, requests),
        getHistoricalPredictionService(code, historicalCaudalType, historicalStart, historicalEnd),
      ])

      if (requestId !== fetchRequestId) return
      applyForecastData(caudalRefs, caudalData)
      caudalRefs.historical.value = historicalData

      if (isEmbalse.value) {
        const [outflow, volume] = await Promise.all([
          getPredictionsService(code, 'FICT95.historical'),
          getHistoricalPredictionService(code, 'VICT01.historical', historicalStart, historicalEnd),
        ])
        if (requestId !== fetchRequestId) return
        caudalOutflowHistorical.value = outflow
        embalseVolumeHistorical.value = volume

        const mikeEmbalseRequestDefs: ForecastRequestDef[] = [
          {
            key: 'forecastHarmonie',
            predictionType: 'I.mk11.forecast',
            simulationDate: selectedMikeDate.value,
          },
          {
            key: 'forecastEpsat',
            predictionType: 'I.mk11.EPSforecast',
            simulationDate: selectedMikeDate.value,
          },
          {
            key: 'forecastEnsP25',
            predictionType: 'I.mk11.EPS25forecast',
            simulationDate: selectedMikeDate.value,
          },
          {
            key: 'forecastEnsP75',
            predictionType: 'I.mk11.EPS75forecast',
            simulationDate: selectedMikeDate.value,
          },
        ]
        try {
          const mikeData = await fetchPredictionBatch(code, mikeEmbalseRequestDefs)
          if (requestId !== fetchRequestId) return
          mikeForecastHarmonie.value = mikeData.forecastHarmonie
          mikeForecastEpsat.value = mikeData.forecastEpsat
          mikeForecastEnsP25.value = mikeData.forecastEnsP25
          mikeForecastEnsP75.value = mikeData.forecastEnsP75
        } catch {
          clearForecasts(mikeRefs)
        }

        const mikeVolumeRequestDefs: ForecastRequestDef[] = [
          {
            key: 'forecastHarmonie',
            predictionType: 'V.MIKE11.harmonie_acum',
            simulationDate: selectedMikeDate.value,
          },
          {
            key: 'forecastEpsat',
            predictionType: 'V.MIKE11.ens.medio_acum',
            simulationDate: selectedMikeDate.value,
          },
          {
            key: 'forecastEnsP25',
            predictionType: 'V.MIKE11.25.medio_acum',
            simulationDate: selectedMikeDate.value,
          },
          {
            key: 'forecastEnsP75',
            predictionType: 'V.MIKE11.75.medio_acum',
            simulationDate: selectedMikeDate.value,
          },
        ]
        try {
          const mikeVolumeData = await fetchPredictionBatch(code, mikeVolumeRequestDefs)
          if (requestId !== fetchRequestId) return
          mikeVolumeHarmonie.value = mikeVolumeData.forecastHarmonie
          mikeVolumeEpsat.value = mikeVolumeData.forecastEpsat
          mikeVolumeEnsP25.value = mikeVolumeData.forecastEnsP25
          mikeVolumeEnsP75.value = mikeVolumeData.forecastEnsP75
        } catch {
          clearForecasts(mikeVolumeRefs)
        }
      } else {
        caudalOutflowHistorical.value = undefined
        embalseVolumeHistorical.value = undefined

        const mikeRequestDefs: ForecastRequestDef[] = [
          {
            key: 'forecastHarmonie',
            predictionType: 'Q.mk11.forecast',
            simulationDate: selectedMikeDate.value,
          },
          {
            key: 'forecastEpsat',
            predictionType: 'Q.mk11.EPSforecast',
            simulationDate: selectedMikeDate.value,
          },
          {
            key: 'forecastEnsP25',
            predictionType: 'Q.mk11.EPS25forecast',
            simulationDate: selectedMikeDate.value,
          },
          {
            key: 'forecastEnsP75',
            predictionType: 'Q.mk11.EPS75forecast',
            simulationDate: selectedMikeDate.value,
          },
        ]

        try {
          const mikeData = await fetchPredictionBatch(code, mikeRequestDefs)
          if (requestId !== fetchRequestId) return
          mikeForecastHarmonie.value = mikeData.forecastHarmonie
          mikeForecastEpsat.value = mikeData.forecastEpsat
          mikeForecastEnsP25.value = mikeData.forecastEnsP25
          mikeForecastEnsP75.value = mikeData.forecastEnsP75
        } catch {
          clearForecasts(mikeRefs)
        }
      }
    } catch (err) {
      console.error('Error loading caudal predictions:', err)
      if (requestId !== fetchRequestId) return
      clearForecasts(caudalRefs)
      clearForecasts(mikeRefs)
      clearForecasts(mikeVolumeRefs)
      caudalOutflowHistorical.value = undefined
      embalseVolumeHistorical.value = undefined
    }
  }

  // ── Watchers ──────────────────────────────────────────────────────────────
  watch(
    [normalizedStationCode, codeType],
    async ([code]) => {
      isFullReloading = true
      clearForecasts(caudalRefs)
      clearForecasts(mikeRefs)
      clearForecasts(mikeVolumeRefs)
      caudalOutflowHistorical.value = undefined
      embalseVolumeHistorical.value = undefined
      harmonieCaudalDates.value = []
      harmoniePrecipDates.value = []
      epsCaudalDates.value = []
      epsPrecipDates.value = []
      mikeDates.value = []
      selectedHarmonieCaudalDate.value = ''
      selectedEpsCaudalDate.value = ''
      selectedMikeDate.value = ''

      if (!code) {
        loading.value = false
        isFullReloading = false
        return
      }

      const requestId = ++fetchRequestId
      loading.value = true

      try {
        await getAvailableDates(code)
        if (requestId !== fetchRequestId) return

        skipNextDateWatch = true
        selectedHarmonieCaudalDate.value = pickDefaultDate('', harmonieCaudalDates.value)
        selectedEpsCaudalDate.value = pickDefaultDate('', epsCaudalDates.value)
        selectedMikeDate.value = pickDefaultDate('', mikeDates.value)

        await refreshCaudalPredictions(requestId)
      } finally {
        isFullReloading = false
        if (requestId === fetchRequestId) loading.value = false
      }
    },
    { immediate: true }
  )

  watch(
    [selectedHarmonieCaudalDate, selectedEpsCaudalDate],
    async (currentValues, previousValues) => {
      if (skipNextDateWatch) {
        skipNextDateWatch = false
        return
      }
      if (isFullReloading) return

      const harmonieChanged = currentValues[0] !== previousValues?.[0]
      const epsChanged = currentValues[1] !== previousValues?.[1]
      if (!harmonieChanged && !epsChanged) return

      loadingHarmoniePredict.value = harmonieChanged
      loadingEpsPredict.value = epsChanged

      const requestId = ++fetchRequestId
      try {
        await refreshCaudalPredictions(requestId)
      } finally {
        loadingHarmoniePredict.value = false
        loadingEpsPredict.value = false
      }
    }
  )

  return {
    // NAM individual refs (for side panels)
    caudalHistorical,
    caudalForecastHarmonie,
    caudalForecastEpstat,
    caudalForecastEnsP10,
    caudalForecastEnsP25,
    caudalForecastEnsP75,
    caudalForecastEnsP90,
    caudalOutflowHistorical,
    embalseVolumeHistorical,

    // MIKE individual refs (for side panels)
    mikeForecastHarmonie,
    mikeForecastEpsat,
    mikeForecastEnsP25,
    mikeForecastEnsP75,

    // MIKE volume refs (embalse only, caller merges resguardos)
    mikeVolumeHarmonie,
    mikeVolumeEpsat,
    mikeVolumeEnsP25,
    mikeVolumeEnsP75,

    // Chart data (without resguardos — caller merges them in)
    caudalBaseChartData,
    caudalOnlyBaseChartData,
    volumenBaseChartData,
    mikeChartData,

    // Dates
    harmonieCaudalDates,
    harmoniePrecipDates,
    epsCaudalDates,
    epsPrecipDates,
    mikeDates,
    selectedHarmonieCaudalDate,
    selectedEpsCaudalDate,
    selectedMikeDate,

    // Loading
    loading,
    loadingHarmoniePredict,
    loadingEpsPredict,
  }
}
