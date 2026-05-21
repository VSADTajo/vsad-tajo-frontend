<template>
  <v-row justify="center" class="px-3">
    <v-col cols="12" md="3" lg="2" class="order-2 order-md-1 d-flex flex-column">
      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihAlertStatus
          :loading="loadingCaudales"
          :caudal-historical="caudalHistorical"
          :thresholds="thresholds"
        />
      </v-card>

      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <v-row>
          <v-col cols="6" md="12">
            <ContentObservedData
              :loading="loadingCaudales"
              :is-embalse="isEmbalse"
              :caudal-historical="caudalHistorical"
              :caudal-outflow-historical="caudalOutflowHistorical"
              :embalse-volume-historical="embalseVolumeHistorical"
              :thresholds="thresholds"
            />
          </v-col>
        </v-row>
      </v-card>

      <v-card class="ma-2 mt-0 pa-2 bg-background w-100 flex-grow-1" elevation="2">
        <ContentSaihOperationalSummary
          :loading="loadingCaudales"
          mode="observed"
          :caudal-historical="caudalHistorical"
          :thresholds="thresholds"
          title="Resumen Operativo Observado"
        />
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="8" class="pt-2 pt-md-4 order-1 order-md-2 d-flex flex-column">
      <div class="w-100 d-flex flex-column">
        <v-card class="bg-background w-100 d-flex flex-column">
          <v-card-text>
            <v-sheet class="pa-5">
              <template v-if="isEmbalse">
                <v-tabs v-model="selectedEmbalseChartTab" density="compact" class="mb-3">
                  <v-tab value="caudal">Caudal</v-tab>
                  <v-tab value="volumen">Volumen</v-tab>
                </v-tabs>

                <v-window v-model="selectedEmbalseChartTab">
                  <v-window-item value="caudal">
                    <ForecastChartNew
                      :data="caudalOnlyChartData"
                      :is-embalse="true"
                      :height="550"
                      :loading="loadingCaudales"
                      :thresholds="thresholds"
                      :focus-threshold-request="thresholdFocusRequest"
                      @focus-threshold-complete="handleThresholdFocusComplete"
                    />
                  </v-window-item>

                  <v-window-item value="volumen">
                    <ForecastChartNew
                      :data="volumenOnlyChartData"
                      :is-embalse="true"
                      :height="550"
                      :loading="loadingCaudales"
                      :thresholds="thresholds"
                      :focus-threshold-request="thresholdFocusRequest"
                      @focus-threshold-complete="handleThresholdFocusComplete"
                    />
                  </v-window-item>
                </v-window>
              </template>

              <template v-else>
                <ForecastChartNew
                  :data="caudalChartData"
                  :is-embalse="isEmbalse"
                  :loading="loadingCaudales"
                  :thresholds="thresholds"
                  :focus-threshold-request="thresholdFocusRequest"
                  @focus-threshold-complete="handleThresholdFocusComplete"
                />
              </template>
            </v-sheet>
          </v-card-text>
        </v-card>

        <v-card class="mt-2 pa-2 bg-background" elevation="2">
          <ContentUmbralesData
            active-tab="caudal"
            :is-embalse="isEmbalse"
            :thresholds="thresholds"
            :selected-threshold="selectedThreshold"
            @focus-threshold="handleThresholdFocus"
          />
        </v-card>

        <v-card class="pa-2 bg-background mt-2" elevation="2">
          <ContentSaihCaudalMatrix
            :forecast-harmonie="caudalForecastHarmonie"
            :forecast-epsat="caudalForecastEpstat"
            :thresholds="thresholds"
            :loading="loadingCaudales"
          />
        </v-card>
      </div>
    </v-col>

    <v-col cols="12" md="3" lg="2" class="order-3 order-md-3 d-flex flex-column">
      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihAlertStatus
          :loading="loadingCaudales"
          :caudal-forecast-harmonie="caudalForecastHarmonie"
          :caudal-forecast-epsat="caudalForecastEpstat"
          :mode="'predictions'"
          :thresholds="thresholds"
        />
      </v-card>
      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihPredictionsLatest
          class="ma-2"
          active-tab="caudal"
          :loading="loadingCaudales"
          :loading-harmonie="loadingHarmoniePredict"
          :loading-eps="loadingEpsPredict"
          :caudal-forecast-harmonie="caudalForecastHarmonie"
          :caudal-forecast-epstat="caudalForecastEpstat"
          :selected-harmonie-caudal-date="selectedHarmonieCaudalDate"
          :selected-eps-caudal-date="selectedEpsCaudalDate"
          :harmonie-caudal-dates="harmonieCaudalDates"
          :eps-caudal-dates="epsCaudalDates"
          :thresholds="thresholds"
          @update:selected-harmonie-caudal-date="
            emit('update:selected-harmonie-caudal-date', $event)
          "
          @update:selected-eps-caudal-date="emit('update:selected-eps-caudal-date', $event)"
        />
      </v-card>

      <v-card class="ma-2 mt-0 pa-2 bg-background w-100 flex-grow-1" elevation="2">
        <ContentSaihOperationalSummary
          :loading="loadingCaudales"
          mode="predictions"
          :caudal-forecast-harmonie="caudalForecastHarmonie"
          :caudal-forecast-epstat="caudalForecastEpstat"
          :caudal-forecast-ens-p10="caudalForecastEnsP10"
          :caudal-forecast-ens-p25="caudalForecastEnsP25"
          :caudal-forecast-ens-p75="caudalForecastEnsP75"
          :caudal-forecast-ens-p90="caudalForecastEnsP90"
          :thresholds="thresholds"
          title="Resumen Operativo Predicciones"
        />
      </v-card>
    </v-col>
  </v-row>

  <v-row class="align-stretch">
    <v-col v-if="isEmbalse" cols="12" md="3" lg="3" class="order-4 order-md-4 d-flex flex-column">
      <v-card
        class="ma-2 mt-2 pa-2 bg-background w-100 flex-grow-1 d-flex flex-column"
        elevation="2"
      >
        <ContentSaihResguardosData
          class="flex-grow-1"
          :resguardo-prediction="effectiveResguardoPrediction"
          :volumen-minimo-prediction="effectiveMinimoPrediction"
          @update:resguardo-prediction="editedResguardoPrediction = $event"
          @update:volumen-minimo-prediction="editedMinimoPrediction = $event"
        />
      </v-card>
    </v-col>

    <v-col v-if="isEmbalse" cols="12" md="6" lg="9" class="order-5 order-md-5 d-flex flex-column">
      <v-card
        class="pa-2 bg-background w-100 mt-2 md:mt-0 flex-grow-1 d-flex flex-column"
        elevation="2"
      >
        <ContentSaihResguardosChart
          class="flex-grow-1"
          :resguardo-prediction="effectiveResguardoPrediction"
          :volumen-minimo-prediction="effectiveMinimoPrediction"
        />
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
  import { computed, ref, watch, type Ref } from 'vue'

  import type {
    DataStationPrediction,
    PredictionTypeName,
    StationPrediction,
  } from '@/types/Predictions'
  import { getAvailablePredictionsService, getPredictionsService } from '@/services/predictions'
  import {
    applyForecastData,
    clearForecasts,
    fetchPredictionBatch,
    pickDefaultDate,
    toDateList,
    type ForecastRequestDef,
  } from './utils/predictionTabUtils'

  import ContentSaihAlertStatus from './ContentSaih/ContentSaihAlertStatus.vue'
  import ForecastChartNew from '../charts/ForecastChartNew.vue'
  import ContentObservedData from './ContentSaih/ContentObservedData.vue'
  import ContentSaihOperationalSummary from './ContentSaih/ContentSaihOperationalSummary.vue'
  import ContentUmbralesData from './ContentSaih/ContentUmbralesData.vue'
  import ContentSaihCaudalMatrix from './ContentSaih/ContentSaihCaudalMatrix.vue'
  import ContentSaihPredictionsLatest from './ContentSaih/ContentSaihPredictionsLatest.vue'
  import ContentSaihResguardosData from './ContentSaih/ContentSaihResguardosData.vue'
  import ContentSaihResguardosChart from './ContentSaih/ContentSaihResguardosChart.vue'

  type ForecastKey = keyof DataStationPrediction
  type ForecastRefsMap = Record<ForecastKey, Ref<StationPrediction | undefined>>

  type ThresholdType = 'caudal' | 'volumen'
  type ThresholdLevel = 1 | 2 | 3
  type ThresholdSelection = { kind: ThresholdType; level: ThresholdLevel } | null
  type ThresholdFocusRequest = {
    action: 'focus' | 'reset'
    kind?: ThresholdType
    level?: ThresholdLevel
    nonce: number
  }

  const props = defineProps<{
    isEmbalse?: boolean
    thresholds?: Record<string, unknown>
    normalizedStationCode: string
  }>()

  const emit = defineEmits<{
    (e: 'update:selected-harmonie-caudal-date', value: string): void
    (e: 'update:selected-eps-caudal-date', value: string): void
  }>()

  const selectedThreshold = ref<ThresholdSelection>(null)
  const thresholdFocusRequest = ref<ThresholdFocusRequest | null>(null)
  const thresholdFocusNonce = ref(0)
  const selectedEmbalseChartTab = ref<'caudal' | 'volumen'>('caudal')

  function handleThresholdFocus(payload: ThresholdSelection): void {
    selectedThreshold.value = payload

    thresholdFocusNonce.value += 1

    if (!payload) {
      thresholdFocusRequest.value = {
        action: 'reset',
        nonce: thresholdFocusNonce.value,
      }
      return
    }

    thresholdFocusRequest.value = {
      action: 'focus',
      kind: payload.kind,
      level: payload.level,
      nonce: thresholdFocusNonce.value,
    }
  }

  function handleThresholdFocusComplete(): void {
    // Intentionally left blank: the selection stays active until the user toggles it off.
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  const loadingCaudales = ref(false)
  const loadingHarmoniePredict = ref(false)
  const loadingEpsPredict = ref(false)

  // ── Caudal data ───────────────────────────────────────────────────────────
  const caudalHistorical = ref<StationPrediction>()
  const caudalForecastEpstat = ref<StationPrediction>()
  const caudalForecastHarmonie = ref<StationPrediction>()
  const caudalForecastEnsP10 = ref<StationPrediction>()
  const caudalForecastEnsP25 = ref<StationPrediction>()
  const caudalForecastEnsP75 = ref<StationPrediction>()
  const caudalForecastEnsP90 = ref<StationPrediction>()
  const caudalOutflowHistorical = ref<StationPrediction>()
  const embalseVolumeHistorical = ref<StationPrediction>()

  // ── Available dates ───────────────────────────────────────────────────────
  const observedCaudalDates = ref<string[]>([])
  const harmonieCaudalDates = ref<string[]>([])
  const harmoniePrecipDates = ref<string[]>([])
  const epsCaudalDates = ref<string[]>([])
  const epsPrecipDates = ref<string[]>([])

  // ── Selected dates ────────────────────────────────────────────────────────
  const selectedObservedCaudalDate = ref('')
  const selectedHarmonieCaudalDate = ref('')
  const selectedEpsCaudalDate = ref('')

  // ── Code type (E = embalse/aforo-especial, default = aforo) ──────────────
  const codeType = computed(() => {
    const val = props.thresholds?.tipoCod
    return typeof val === 'string' ? val : undefined
  })

  // ── Mocks ─────────────────────────────────────────────────────────────────
  function currentHydrologicalYearBounds(now: Date): { start: Date; end: Date } {
    const month = now.getMonth()
    const year = now.getFullYear()
    if (month >= 8) {
      return { start: new Date(year, 8, 1, 0, 0, 0), end: new Date(year + 1, 8, 1, 0, 0, 0) }
    }
    return { start: new Date(year - 1, 8, 1, 0, 0, 0), end: new Date(year, 8, 1, 0, 0, 0) }
  }

  function hashCode(text: string): number {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0
    }
    return hash
  }

  const resguardoVolumeMock = computed<StationPrediction | undefined>(() => {
    if (!props.isEmbalse || !props.normalizedStationCode) return undefined
    const stationId = props.normalizedStationCode
    const bounds = currentHydrologicalYearBounds(new Date())
    const seed = hashCode(stationId)
    const hm3Value = 35 + (seed % 1200) / 10
    return {
      id: `resguardo-${stationId}-${bounds.start.getFullYear()}`,
      stationId,
      stationName: stationId,
      predictionTypeName: 'resguardo.hydrologicalYear.mock',
      simulationDate: bounds.start.toISOString(),
      predictionDate: new Date().toISOString(),
      predictionProvider: 'mock',
      predictedBy: 'ui-mock',
      results: [
        { id: 1, date: bounds.start.toISOString(), value: hm3Value, flag: 0 },
        { id: 2, date: bounds.end.toISOString(), value: hm3Value, flag: 0 },
      ],
    }
  })

  const volumenMinimoMock = computed<StationPrediction | undefined>(() => {
    if (!props.isEmbalse || !props.normalizedStationCode) return undefined
    const stationId = props.normalizedStationCode
    const bounds = currentHydrologicalYearBounds(new Date())
    const seed = hashCode(`${stationId}-min`)
    const hm3Value = 10 + (seed % 500) / 10
    return {
      id: `minimo-${stationId}-${bounds.start.getFullYear()}`,
      stationId,
      stationName: stationId,
      predictionTypeName: 'volumen.minimo.hydrologicalYear.mock',
      simulationDate: bounds.start.toISOString(),
      predictionDate: new Date().toISOString(),
      predictionProvider: 'mock',
      predictedBy: 'ui-mock',
      results: [
        { id: 1, date: bounds.start.toISOString(), value: hm3Value, flag: 0 },
        { id: 2, date: bounds.end.toISOString(), value: hm3Value, flag: 0 },
      ],
    }
  })

  const editedResguardoPrediction = ref<StationPrediction>()
  const editedMinimoPrediction = ref<StationPrediction>()
  const effectiveResguardoPrediction = computed(
    () => editedResguardoPrediction.value ?? resguardoVolumeMock.value
  )
  const effectiveMinimoPrediction = computed(
    () => editedMinimoPrediction.value ?? volumenMinimoMock.value
  )

  // ── Refs map & chart data ─────────────────────────────────────────────────
  const caudalRefs: ForecastRefsMap = {
    historical: caudalHistorical,
    forecastHarmonie: caudalForecastHarmonie,
    forecastEpsat: caudalForecastEpstat,
    forecastEnsP10: caudalForecastEnsP10,
    forecastEnsP25: caudalForecastEnsP25,
    forecastEnsP75: caudalForecastEnsP75,
    forecastEnsP90: caudalForecastEnsP90,
  }

  const caudalChartData = computed(() => ({
    historical: caudalHistorical.value,
    historicalOutflow: caudalOutflowHistorical.value,
    historicalVolume: embalseVolumeHistorical.value,
    resguardoVolume: effectiveResguardoPrediction.value,
    minimumVolume: effectiveMinimoPrediction.value,
    forecastHarmonie: caudalForecastHarmonie.value,
    forecastEpsat: caudalForecastEpstat.value,
    forecastEnsP10: caudalForecastEnsP10.value,
    forecastEnsP25: caudalForecastEnsP25.value,
    forecastEnsP90: caudalForecastEnsP90.value,
    forecastEnsP75: caudalForecastEnsP75.value,
  }))

  const caudalOnlyChartData = computed(() => ({
    historical: caudalHistorical.value,
    historicalOutflow: caudalOutflowHistorical.value,
    historicalVolume: undefined,
    resguardoVolume: undefined,
    minimumVolume: undefined,
    forecastHarmonie: caudalForecastHarmonie.value,
    forecastEpsat: caudalForecastEpstat.value,
    forecastEnsP10: caudalForecastEnsP10.value,
    forecastEnsP25: caudalForecastEnsP25.value,
    forecastEnsP90: caudalForecastEnsP90.value,
    forecastEnsP75: caudalForecastEnsP75.value,
  }))

  const volumenOnlyChartData = computed(() => ({
    historical: undefined,
    historicalOutflow: undefined,
    historicalVolume: embalseVolumeHistorical.value,
    resguardoVolume: effectiveResguardoPrediction.value,
    minimumVolume: effectiveMinimoPrediction.value,
    forecastHarmonie: undefined,
    forecastEpsat: undefined,
    forecastEnsP10: undefined,
    forecastEnsP25: undefined,
    forecastEnsP90: undefined,
    forecastEnsP75: undefined,
  }))

  void caudalChartData.value

  // ── Request definitions por tipo de estación ──────────────────────────────
  const caudalRequestsByType = computed<Record<'default' | 'E', ForecastRequestDef[]>>(() => ({
    default: [
      {
        key: 'historical',
        predictionType: 'FICT98.historical',
        simulationDate: selectedObservedCaudalDate.value,
      },
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
        key: 'historical',
        predictionType: 'FICT99.historical',
        simulationDate: selectedObservedCaudalDate.value,
      },
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

  // ── Fetch available dates ─────────────────────────────────────────────────
  async function getAvailableDates(code: string) {
    const selectedCodeType = codeType.value === 'E' ? 'E' : 'default'
    const observedCaudalType: PredictionTypeName =
      selectedCodeType === 'E' ? 'FICT99.historical' : 'FICT98.historical'
    const harmonieCaudalType: PredictionTypeName =
      selectedCodeType === 'E' ? 'I.NAM.harmonie' : 'Q.NAM.harmonie'
    const epsCaudalTypes: PredictionTypeName[] =
      selectedCodeType === 'E' ? ['I.NAM.ens.medio', 'I.NAM.ens'] : ['Q.NAM.ens']

    try {
      const [
        observedCaudalResponse,
        harmonieCaudalResponse,
        harmoniePrecipResponse,
        ...epsResponses
      ] = await Promise.all([
        getAvailablePredictionsService(code, observedCaudalType),
        getAvailablePredictionsService(code, harmonieCaudalType),
        getAvailablePredictionsService(code, 'P.harmonie.forecast'),
        ...epsCaudalTypes.map((type) => getAvailablePredictionsService(code, type)),
      ])

      observedCaudalDates.value = toDateList(observedCaudalResponse)
      harmonieCaudalDates.value = toDateList(harmonieCaudalResponse)
      harmoniePrecipDates.value = toDateList(harmoniePrecipResponse)
      epsCaudalDates.value = Array.from(new Set(epsResponses.flatMap(toDateList))).sort((a, b) =>
        b.localeCompare(a)
      )
    } catch (err) {
      console.error('Error loading available dates:', err)
      observedCaudalDates.value = []
      harmonieCaudalDates.value = []
      harmoniePrecipDates.value = []
      epsCaudalDates.value = []
      epsPrecipDates.value = []
    }
  }

  // ── Refresh caudal predictions ────────────────────────────────────────────
  let fetchRequestId = 0
  let isFullReloading = false
  let skipNextDateWatch = false

  async function refreshCaudalPredictions(requestId: number) {
    const code = props.normalizedStationCode
    if (!code) return

    try {
      const requests =
        codeType.value === 'E' ? caudalRequestsByType.value.E : caudalRequestsByType.value.default

      const caudalData = await fetchPredictionBatch(code, requests)
      if (requestId !== fetchRequestId) return
      applyForecastData(caudalRefs, caudalData)

      if (props.isEmbalse && selectedObservedCaudalDate.value) {
        const [outflow, volume] = await Promise.all([
          getPredictionsService(code, 'FICT95.historical', selectedObservedCaudalDate.value),
          getPredictionsService(code, 'VICT01.historical', selectedObservedCaudalDate.value),
        ])
        if (requestId !== fetchRequestId) return
        caudalOutflowHistorical.value = outflow
        embalseVolumeHistorical.value = volume
      } else {
        caudalOutflowHistorical.value = undefined
        embalseVolumeHistorical.value = undefined
      }
    } catch (err) {
      console.error('Error loading caudal predictions:', err)
      if (requestId !== fetchRequestId) return
      clearForecasts(caudalRefs)
      caudalOutflowHistorical.value = undefined
      embalseVolumeHistorical.value = undefined
    }
  }

  // ── Watchers ──────────────────────────────────────────────────────────────
  watch(
    [() => props.normalizedStationCode, codeType],
    async ([code]) => {
      isFullReloading = true
      clearForecasts(caudalRefs)
      caudalOutflowHistorical.value = undefined
      embalseVolumeHistorical.value = undefined
      observedCaudalDates.value = []
      harmonieCaudalDates.value = []
      harmoniePrecipDates.value = []
      epsCaudalDates.value = []
      epsPrecipDates.value = []
      selectedObservedCaudalDate.value = ''
      selectedHarmonieCaudalDate.value = ''
      selectedEpsCaudalDate.value = ''

      if (!code) {
        loadingCaudales.value = false
        isFullReloading = false
        return
      }

      const requestId = ++fetchRequestId
      loadingCaudales.value = true
      try {
        await getAvailableDates(code)
        if (requestId !== fetchRequestId) return

        skipNextDateWatch = true
        selectedObservedCaudalDate.value = pickDefaultDate('', observedCaudalDates.value)
        selectedHarmonieCaudalDate.value = pickDefaultDate('', harmonieCaudalDates.value)
        selectedEpsCaudalDate.value = pickDefaultDate('', epsCaudalDates.value)

        await refreshCaudalPredictions(requestId)
      } finally {
        isFullReloading = false
        if (requestId === fetchRequestId) loadingCaudales.value = false
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
</script>
