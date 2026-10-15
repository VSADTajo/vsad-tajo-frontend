<template>
  <StationStickyHeader
    :feature="stationFeature"
    :loading="loading"
    :header-style="headerStyle"
    @close="close"
  >
    <v-chip
      v-if="simulationRelation"
      size="x-small"
      class="chip-sim-relation ml-2"
      :prepend-icon="
        simulationRelation === 'downstream'
          ? 'mdi-arrow-down-circle-outline'
          : 'mdi-circle-off-outline'
      "
    >
      {{
        simulationRelation === 'downstream'
          ? 'Datos Según Simulación en Curso'
          : 'Datos Independientes de la Simulación en Curso'
      }}
    </v-chip>
  </StationStickyHeader>

  <v-row v-if="station" justify="center" class="px-3 align-stretch">
    <v-col
      cols="12"
      md="3"
      lg="2"
      class="order-2 order-md-1 d-flex flex-column"
      style="min-height: 0"
    >
      <v-card
        ref="leftStatusCardEl"
        class="ma-2 pa-2 bg-background w-100 flex-shrink-0"
        elevation="2"
      >
        <ContentSaihAlertStatus
          :loading="loadingCaudales"
          :caudal-historical="caudalHistorical"
          :thresholds="flatThresholds"
        />
      </v-card>

      <v-card
        ref="leftObservedCardEl"
        class="ma-2 pa-2 bg-background w-100 flex-shrink-0"
        elevation="2"
      >
        <v-row>
          <v-col cols="6" md="12">
            <ContentObservedData
              :loading="loadingCaudales"
              :is-embalse="isEmbalse"
              :embalse-section="activeEmbalseTab"
              :caudal-historical="caudalHistorical"
              :caudal-outflow-historical="caudalOutflowHistorical"
              :embalse-volume-historical="embalseVolumeHistorical"
              :thresholds="flatThresholds"
            />
          </v-col>
        </v-row>
      </v-card>

      <v-card
        v-if="!isEmbalse || (isEmbalse && activeEmbalseTab === 'caudal')"
        ref="leftSummaryCardEl"
        class="ma-2 mt-0 pa-2 bg-background w-100 d-flex flex-column summary-container-card"
        elevation="2"
        :style="leftSummaryCardStyle"
      >
        <ContentSaihOperationalSummary
          :loading="loadingCaudales"
          mode="observed"
          :is-embalse="isEmbalse"
          :caudal-historical="caudalHistorical"
          :caudal-outflow-historical="caudalOutflowHistorical"
          :embalse-volume-historical="embalseVolumeHistorical"
          :thresholds="flatThresholds"
          title="Resumen Operativo Observado"
        />
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="8" class="pt-2 pt-md-4 order-1 order-md-2 d-flex flex-column">
      <div ref="centerStackEl" class="w-100 d-flex flex-column">
        <v-card class="bg-background w-100 d-flex flex-column">
          <v-card-text>
            <v-sheet class="pa-5">
              <template v-if="isEmbalse">
                <v-tabs v-model="activeEmbalseTab" density="compact" class="mb-3">
                  <v-tab value="caudal">Caudal</v-tab>
                  <v-tab value="volumen">Volumen</v-tab>
                </v-tabs>
                <div class="chart-tab-root">
                  <div
                    :class="[
                      'chart-tab-panel',
                      { 'chart-tab-panel--hidden': activeEmbalseTab !== 'caudal' },
                    ]"
                  >
                    <ForecastChartNew
                      v-if="mountedEmbalseTabs.has('caudal')"
                      :data="chartData"
                      :is-embalse="true"
                      :height="550"
                      :loading="loadingCaudales"
                      :thresholds="flatThresholds"
                      :focus-threshold-request="thresholdFocusRequest"
                      @focus-threshold-complete="handleThresholdFocusComplete"
                    />
                  </div>
                  <div
                    :class="[
                      'chart-tab-panel',
                      'chart-tab-overlay',
                      { 'chart-tab-panel--hidden': activeEmbalseTab !== 'volumen' },
                    ]"
                  >
                    <ForecastChartNew
                      v-if="mountedEmbalseTabs.has('volumen')"
                      :data="volumenChartData"
                      :is-embalse="true"
                      :volume-only="true"
                      :height="550"
                      :loading="loadingCaudales || loadingSimulationVolume"
                      :thresholds="chartThresholds"
                      :focus-threshold-request="thresholdFocusRequest"
                      @focus-threshold-complete="handleThresholdFocusComplete"
                    />
                  </div>
                </div>
              </template>

              <ForecastChartNew
                v-else
                :data="chartData"
                :height="550"
                :loading="loadingCaudales"
                :thresholds="flatThresholds"
                :focus-threshold-request="thresholdFocusRequest"
                @focus-threshold-complete="handleThresholdFocusComplete"
              />
            </v-sheet>
          </v-card-text>
        </v-card>

        <v-card v-if="activeEmbalseTab !== 'volumen'" class="mt-2 pa-2 bg-background" elevation="2">
          <ContentUmbralesData
            active-tab="caudalNAM"
            :is-embalse="isEmbalse"
            :thresholds="flatThresholds"
            :selected-threshold="selectedThreshold"
            @focus-threshold="handleThresholdFocus"
          />
        </v-card>

        <v-card class="pa-2 bg-background mt-2" elevation="2">
          <ContentSaihCaudalMatrix
            :forecast-harmonie="matrixData.forecastHarmonie"
            :forecast-epsat="matrixData.forecastEpsat"
            :forecast-ens-p10="matrixData.forecastEnsP10"
            :forecast-ens-p25="matrixData.forecastEnsP25"
            :forecast-ens-p75="matrixData.forecastEnsP75"
            :forecast-ens-p90="matrixData.forecastEnsP90"
            :observed="matrixData.observed"
            :observed-entrada="matrixData.observedEntrada"
            :observed-salida="matrixData.observedSalida"
            :thresholds="chartThresholds"
            :no-thresholds="activeEmbalseTab === 'volumen'"
            :loading="matrixLoading"
          />
        </v-card>
      </div>
    </v-col>

    <v-col
      cols="12"
      md="3"
      lg="2"
      class="order-3 order-md-3 d-flex flex-column pl-0"
      style="min-height: 0"
    >
      <v-card
        ref="rightStatusCardEl"
        class="ma-2 pa-2 bg-background w-100 flex-shrink-0"
        elevation="2"
      >
        <ContentSaihAlertStatus
          :loading="loadingCaudales"
          :caudal-forecast-harmonie="caudalForecastHarmonie"
          :caudal-forecast-epsat="undefined"
          active-tab="caudal"
          mode="predictions"
          :thresholds="flatThresholds"
        />
      </v-card>

      <v-card
        ref="rightLatestCardEl"
        class="ma-2 pa-2 bg-background w-100 flex-shrink-0"
        elevation="2"
      >
        <ContentSaihPredictionsLatest
          class="ma-2"
          :active-tab="isEmbalse ? activeEmbalseTab : 'caudal'"
          hide-date-selector
          :loading="
            isEmbalse && activeEmbalseTab === 'volumen' ? loadingSimulationVolume : loadingCaudales
          "
          :loading-harmonie="
            isEmbalse && activeEmbalseTab === 'volumen'
              ? loadingSimulationVolume
              : loadingHarmoniePredict
          "
          :loading-eps="
            isEmbalse && activeEmbalseTab === 'volumen'
              ? loadingSimulationVolume
              : loadingEpsPredict
          "
          :caudal-forecast-harmonie="
            isEmbalse && activeEmbalseTab === 'volumen'
              ? simulationVolumeHarmonie
              : caudalForecastHarmonie
          "
          :caudal-forecast-epstat="
            isEmbalse && activeEmbalseTab === 'volumen'
              ? simulationVolumeEpsat
              : caudalForecastEpstat
          "
          :selected-harmonie-caudal-date="selectedHarmonieCaudalDate"
          :selected-eps-caudal-date="selectedEpsCaudalDate"
          :harmonie-caudal-dates="harmonieCaudalDates"
          :eps-caudal-dates="epsCaudalDates"
          :thresholds="chartThresholds"
          @update:selected-harmonie-caudal-date="selectedHarmonieCaudalDate = $event"
          @update:selected-eps-caudal-date="selectedEpsCaudalDate = $event"
        />
      </v-card>

      <v-card
        v-if="!isEmbalse || (isEmbalse && activeEmbalseTab === 'caudal')"
        ref="rightSummaryCardEl"
        class="ma-2 mt-0 pa-2 bg-background w-100 d-flex flex-column summary-container-card"
        elevation="2"
        :style="rightSummaryCardStyle"
      >
        <ContentSaihOperationalSummary
          :loading="loadingCaudales"
          mode="predictions"
          active-tab="caudal"
          :caudal-forecast-harmonie="caudalForecastHarmonie"
          :caudal-forecast-epstat="caudalForecastEpstat"
          :caudal-forecast-ens-p10="undefined"
          :caudal-forecast-ens-p25="undefined"
          :caudal-forecast-ens-p75="undefined"
          :caudal-forecast-ens-p90="undefined"
          :thresholds="flatThresholds"
          title="Resumen Operativo Predicciones"
        />
      </v-card>
    </v-col>
  </v-row>

  <v-row v-if="station && isEmbalse && activeEmbalseTab === 'volumen'" class="align-stretch">
    <v-col cols="12" md="3" lg="3" class="order-4 order-md-4 d-flex flex-column">
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

    <v-col cols="12" md="6" lg="9" class="order-5 order-md-5 d-flex flex-column">
      <v-card
        class="pa-2 bg-background w-100 mt-2 md:mt-0 flex-grow-1 d-flex flex-column"
        elevation="2"
      >
        <ContentSaihResguardosChart
          class="flex-grow-1"
          :resguardos-data="resguardosApiData"
          :loading="loadingResguardos"
        />
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
  import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { getStationByCodeService, type StationByCodeResponse } from '@/services/general'
  import { getSimulationStationResultsService } from '@/services/simulations'
  import type { SimulationResultPrediction } from '@/types/Simulations'
  import type { StationPrediction } from '@/types/Predictions'
  import { useSimulationsStore } from '@/stores/simulationsStore'
  import { isDownstreamStation } from '@/utils/saihMarkersRegistry'
  import { getSaihTypeColor } from '@/utils/saihStations'
  import { embalsesWithCaudalPredictions } from '@/constants/predictionsAvailableData'
  import { useCaudalPredictions } from '@/composables/useCaudalPredictions'
  import { useResguardos } from '@/composables/useResguardos'
  import ForecastChartNew from '../charts/ForecastChartNew.vue'
  import ContentSaihAlertStatus from './ContentSaih/ContentSaihAlertStatus.vue'
  import ContentObservedData from './ContentSaih/ContentObservedData.vue'
  import ContentSaihOperationalSummary from './ContentSaih/ContentSaihOperationalSummary.vue'
  import ContentUmbralesData from './ContentSaih/ContentUmbralesData.vue'
  import ContentSaihCaudalMatrix from './ContentSaih/ContentSaihCaudalMatrix.vue'
  import ContentSaihPredictionsLatest from './ContentSaih/ContentSaihPredictionsLatest.vue'
  import ContentSaihResguardosData from './ContentSaih/ContentSaihResguardosData.vue'
  import ContentSaihResguardosChart from './ContentSaih/ContentSaihResguardosChart.vue'
  import StationStickyHeader from './StationStickyHeader.vue'

  type ThresholdType = 'caudal' | 'volumen'
  type ThresholdLevel = 1 | 2 | 3
  type ThresholdSelection = { kind: ThresholdType; level: ThresholdLevel } | null
  type ThresholdFocusRequest = {
    action: 'focus' | 'reset'
    kind?: ThresholdType
    level?: ThresholdLevel
    nonce: number
  }

  const route = useRoute()
  const router = useRouter()
  const simulationsStore = useSimulationsStore()

  const simulationRelation = computed<'downstream' | 'independent' | null>(() => {
    if (!simulationsStore.isSimulationActive) return null
    return isDownstreamStation(normalizedStationCode.value) ? 'downstream' : 'independent'
  })

  // ── Station loading ────────────────────────────────────────────────────────
  const loading = ref(false)
  const station = ref<StationByCodeResponse | null>(null)
  const stationCode = computed(() => route.query.station as string | undefined)

  const normalizedStationCode = computed(
    () =>
      station.value?.stationCode?.trim().toUpperCase() ??
      stationCode.value?.trim().toUpperCase() ??
      ''
  )

  const embalsesSet = new Set(embalsesWithCaudalPredictions)
  const isEmbalse = computed(() => embalsesSet.has(normalizedStationCode.value))

  // Whether the active simulation actually produced predictions for this
  // station — read straight from simulationResults (a reactive Pinia ref)
  // rather than isDownstreamStation()'s plain Set, which doesn't trigger
  // Vue reactivity when it's mutated asynchronously after this computes.
  const hasSimulationDataForStation = computed(() => {
    const results = simulationsStore.simulationResults
    if (!results || !normalizedStationCode.value) return false
    return results.predictions.some(
      (p) =>
        (p.station?.stationCode ?? p.stationId ?? '').toUpperCase() === normalizedStationCode.value
    )
  })

  const codeType = computed(() => {
    const val = station.value?.tipoCod
    return typeof val === 'string' ? val : undefined
  })

  const stationFeature = computed<GeoJSON.Feature | null>(() => {
    const s = station.value
    if (!s) return null
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [s.longitude ?? 0, s.latitude ?? 0],
      },
      properties: {
        ...(s as unknown as Record<string, unknown>),
        tipo: 'SAIH',
        codigo: s.stationCode,
        nombre: s.name,
      },
    }
  })

  const flatThresholds = computed<Record<string, unknown> | undefined>(() => {
    const s = station.value
    if (!s) return undefined
    const t = s.threshold as Record<string, unknown> | undefined
    // For embalses the only threshold value the backend sends often lives
    // under umbralVolumenX, but it's a caudal-scale figure (there is no
    // separate, distinct volumen threshold) — so it's valid to surface it
    // as "umbral_caudal_X" for caudal-tab consumers (ContentUmbralesData,
    // the caudal chart/matrix). It must NOT be reused on volumen-scale
    // displays (different units) — see chartThresholds below, which is what
    // volumen-tab consumers should bind to instead of this directly.
    return {
      ...(s as unknown as Record<string, unknown>),
      umbral_caudal_1: t?.umbralCaudal1 ?? t?.umbralNivel1 ?? t?.umbralVolumen1 ?? null,
      umbral_caudal_2: t?.umbralCaudal2 ?? t?.umbralNivel2 ?? t?.umbralVolumen2 ?? null,
      umbral_caudal_3: t?.umbralCaudal3 ?? t?.umbralNivel3 ?? t?.umbralVolumen3 ?? null,
      umbral_cauda_1: t?.umbralCaudal1 ?? t?.umbralNivel1 ?? t?.umbralVolumen1 ?? null,
      umbral_cauda_2: t?.umbralCaudal2 ?? t?.umbralNivel2 ?? t?.umbralVolumen2 ?? null,
      umbral_cauda_3: t?.umbralCaudal3 ?? t?.umbralNivel3 ?? t?.umbralVolumen3 ?? null,
    }
  })

  // Thresholds are caudal-scale only — never valid on the volumen chart/
  // matrix (different units/scale), so those consumers get undefined there.
  const chartThresholds = computed<Record<string, unknown> | undefined>(() =>
    activeEmbalseTab.value === 'volumen' ? undefined : flatThresholds.value
  )

  function shadeHex(hex: string, factor: number): string {
    const value = hex.replace('#', '')
    const full =
      value.length === 3
        ? value
            .split('')
            .map((c) => c + c)
            .join('')
        : value
    const num = Number.parseInt(full, 16)
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
    const r = clamp(((num >> 16) & 255) * factor)
    const g = clamp(((num >> 8) & 255) * factor)
    const b = clamp((num & 255) * factor)
    return `rgb(${r}, ${g}, ${b})`
  }

  const headerStyle = computed(() => {
    if (!station.value) {
      return { background: 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)' }
    }
    const base = getSaihTypeColor(station.value.tipoCod)
    return { background: `linear-gradient(135deg, ${base} 0%, ${shadeHex(base, 0.72)} 100%)` }
  })

  let requestId = 0
  watch(
    stationCode,
    async (code) => {
      station.value = null
      if (!code) return
      const id = ++requestId
      loading.value = true
      try {
        const result = await getStationByCodeService(code)
        if (id === requestId) station.value = result
      } finally {
        if (id === requestId) loading.value = false
      }
    },
    { immediate: true }
  )

  // ── Data composables ───────────────────────────────────────────────────────
  const {
    caudalHistorical,
    caudalForecastHarmonie,
    caudalForecastEpstat,
    caudalOutflowHistorical,
    embalseVolumeHistorical,
    harmonieCaudalDates,
    epsCaudalDates,
    selectedHarmonieCaudalDate,
    selectedEpsCaudalDate,
    loading: loadingCaudales,
    loadingHarmoniePredict,
    loadingEpsPredict,
  } = useCaudalPredictions(normalizedStationCode, isEmbalse, codeType)

  const {
    resguardosApiData,
    loadingResguardos,
    effectiveResguardoPrediction,
    effectiveMinimoPrediction,
    editedResguardoPrediction,
    editedMinimoPrediction,
  } = useResguardos(normalizedStationCode, isEmbalse)

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = computed(() => ({
    historical: caudalHistorical.value,
    historicalVolume: undefined,
    resguardoVolume: undefined,
    minimumVolume: undefined,
    forecastHarmonie: caudalForecastHarmonie.value,
    forecastEpsat: undefined,
    forecastEnsP10: undefined,
    forecastEnsP25: undefined,
    forecastEnsP75: undefined,
    forecastEnsP90: undefined,
  }))

  const volumenChartData = computed(() => ({
    historical: undefined,
    historicalOutflow: undefined,
    historicalVolume: embalseVolumeHistorical.value,
    resguardoVolume: effectiveResguardoPrediction.value,
    minimumVolume: effectiveMinimoPrediction.value,
    forecastHarmonie: simulationVolumeHarmonie.value,
    forecastEpsat: simulationVolumeEpsat.value,
    forecastEnsP10: simulationVolumeEnsP10.value,
    forecastEnsP25: simulationVolumeEnsP25.value,
    forecastEnsP75: simulationVolumeEnsP75.value,
    forecastEnsP90: simulationVolumeEnsP90.value,
  }))

  // ── Simulation volume predictions (Volumen tab) ────────────────────────────
  // The summary /results call (withResults=false, used for the map popups)
  // only has max/last per station. The volumen chart needs the full time
  // series, which only the per-station call with withResults=true returns —
  // that same call already includes every EPS percentile, not just P50.
  const simulationVolumeHarmonie = ref<StationPrediction | undefined>(undefined)
  const simulationVolumeEpsat = ref<StationPrediction | undefined>(undefined)
  const simulationVolumeEnsP10 = ref<StationPrediction | undefined>(undefined)
  const simulationVolumeEnsP25 = ref<StationPrediction | undefined>(undefined)
  const simulationVolumeEnsP75 = ref<StationPrediction | undefined>(undefined)
  const simulationVolumeEnsP90 = ref<StationPrediction | undefined>(undefined)
  const loadingSimulationVolume = ref(false)

  function toStationPrediction(
    prediction?: SimulationResultPrediction
  ): StationPrediction | undefined {
    if (!prediction) return undefined

    return {
      id: prediction.id,
      stationId: prediction.stationId,
      stationName: prediction.stationName,
      predictionTypeName: prediction.predictionTypeName,
      simulationDate: prediction.predictionDate,
      predictionDate: prediction.predictionDate,
      percentile: prediction.percentile != null ? String(prediction.percentile) : undefined,
      predictionProvider: prediction.predictionProvider,
      predictedBy: prediction.predictedBy,
      results: (prediction.results ?? []).map((r, i) => ({
        id: i,
        date: r.date,
        value: r.value,
        flag: r.flag,
      })),
    }
  }

  let simulationVolumeRequestId = 0

  async function loadSimulationVolumePredictions(simId: string, code: string): Promise<void> {
    const requestId = ++simulationVolumeRequestId
    loadingSimulationVolume.value = true

    try {
      const response = await getSimulationStationResultsService(simId, code)
      if (requestId !== simulationVolumeRequestId) return

      const findEps = (percentile: number) =>
        response.predictions.find(
          (p) => p.predictionTypeName.endsWith('.eps') && p.percentile === percentile
        )
      const harmonie = response.predictions.find((p) => p.predictionTypeName.endsWith('.harmonie'))

      simulationVolumeEpsat.value = toStationPrediction(findEps(50))
      simulationVolumeHarmonie.value = toStationPrediction(harmonie)
      simulationVolumeEnsP10.value = toStationPrediction(findEps(10))
      simulationVolumeEnsP25.value = toStationPrediction(findEps(25))
      simulationVolumeEnsP75.value = toStationPrediction(findEps(75))
      simulationVolumeEnsP90.value = toStationPrediction(findEps(90))
    } catch {
      if (requestId !== simulationVolumeRequestId) return
      simulationVolumeEpsat.value = undefined
      simulationVolumeHarmonie.value = undefined
      simulationVolumeEnsP10.value = undefined
      simulationVolumeEnsP25.value = undefined
      simulationVolumeEnsP75.value = undefined
      simulationVolumeEnsP90.value = undefined
    } finally {
      if (requestId === simulationVolumeRequestId) loadingSimulationVolume.value = false
    }
  }

  watch(
    [() => simulationsStore.activeSimulationId, normalizedStationCode, hasSimulationDataForStation],
    ([simId, code, hasData]) => {
      simulationVolumeRequestId++
      simulationVolumeHarmonie.value = undefined
      simulationVolumeEpsat.value = undefined
      simulationVolumeEnsP10.value = undefined
      simulationVolumeEnsP25.value = undefined
      simulationVolumeEnsP75.value = undefined
      simulationVolumeEnsP90.value = undefined
      loadingSimulationVolume.value = false

      if (!simId || !code || !hasData) return
      void loadSimulationVolumePredictions(simId, code)
    },
    { immediate: true }
  )

  // ── Embalse chart tabs ─────────────────────────────────────────────────────
  const activeEmbalseTab = ref<'caudal' | 'volumen'>('caudal')
  const mountedEmbalseTabs = reactive(new Set<string>(['caudal']))
  watch(activeEmbalseTab, (tab) => mountedEmbalseTabs.add(tab))

  // ContentSaihCaudalMatrix should mirror whichever tab's own observed +
  // predicted data is currently shown in the chart above it, not always
  // caudal — same source data as chartData/volumenChartData.
  const matrixData = computed(() =>
    activeEmbalseTab.value === 'volumen'
      ? {
          forecastHarmonie: simulationVolumeHarmonie.value,
          forecastEpsat: simulationVolumeEpsat.value,
          forecastEnsP10: simulationVolumeEnsP10.value,
          forecastEnsP25: simulationVolumeEnsP25.value,
          forecastEnsP75: simulationVolumeEnsP75.value,
          forecastEnsP90: simulationVolumeEnsP90.value,
          observed: embalseVolumeHistorical.value,
          observedEntrada: undefined,
          observedSalida: undefined,
        }
      : {
          forecastHarmonie: caudalForecastHarmonie.value,
          forecastEpsat: undefined,
          forecastEnsP10: undefined,
          forecastEnsP25: undefined,
          forecastEnsP75: undefined,
          forecastEnsP90: undefined,
          observed: undefined,
          observedEntrada: caudalHistorical.value,
          observedSalida: caudalOutflowHistorical.value,
        }
  )

  const matrixLoading = computed(
    () =>
      loadingCaudales.value ||
      (activeEmbalseTab.value === 'volumen' && loadingSimulationVolume.value)
  )

  // ── Threshold focus ────────────────────────────────────────────────────────
  const selectedThreshold = ref<ThresholdSelection>(null)
  const thresholdFocusRequest = ref<ThresholdFocusRequest | null>(null)
  const thresholdFocusNonce = ref(0)

  function handleThresholdFocus(payload: ThresholdSelection): void {
    selectedThreshold.value = payload
    thresholdFocusNonce.value += 1
    if (!payload) {
      thresholdFocusRequest.value = { action: 'reset', nonce: thresholdFocusNonce.value }
      return
    }
    thresholdFocusRequest.value = {
      action: 'focus',
      kind: payload.kind,
      level: payload.level,
      nonce: thresholdFocusNonce.value,
    }
  }

  function handleThresholdFocusComplete(): void {}

  // ── Layout height management ───────────────────────────────────────────────
  const centerStackEl = ref<HTMLElement | null>(null)
  const leftStatusCardEl = ref<unknown>(null)
  const leftObservedCardEl = ref<unknown>(null)
  const leftSummaryCardEl = ref<unknown>(null)
  const rightStatusCardEl = ref<unknown>(null)
  const rightLatestCardEl = ref<unknown>(null)
  const rightSummaryCardEl = ref<unknown>(null)

  const leftSummaryHeightPx = ref(280)
  const rightSummaryHeightPx = ref(280)

  const leftSummaryCardStyle = computed(() => ({
    minHeight: '0',
    height: `${leftSummaryHeightPx.value}px`,
    maxHeight: `${leftSummaryHeightPx.value}px`,
  }))

  const rightSummaryCardStyle = computed(() => ({
    minHeight: '0',
    height: `${rightSummaryHeightPx.value}px`,
    maxHeight: `${rightSummaryHeightPx.value}px`,
  }))

  function resolveElement(target: unknown): HTMLElement | null {
    if (target instanceof HTMLElement) return target
    if (
      typeof target === 'object' &&
      target !== null &&
      '$el' in target &&
      (target as { $el?: unknown }).$el instanceof HTMLElement
    ) {
      return (target as { $el: HTMLElement }).$el
    }
    return null
  }

  function outerHeightWithMargins(target: unknown): number {
    const el = resolveElement(target)
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const styles = window.getComputedStyle(el)
    const mt = Number.parseFloat(styles.marginTop || '0') || 0
    const mb = Number.parseFloat(styles.marginBottom || '0') || 0
    return rect.height + mt + mb
  }

  function updateSummaryHeights(): void {
    const target = resolveElement(centerStackEl.value)?.getBoundingClientRect().height ?? 0
    if (target <= 0) return
    const leftBase =
      outerHeightWithMargins(leftStatusCardEl.value) +
      outerHeightWithMargins(leftObservedCardEl.value)
    const rightBase =
      outerHeightWithMargins(rightStatusCardEl.value) +
      outerHeightWithMargins(rightLatestCardEl.value)
    leftSummaryHeightPx.value = Math.max(0, target - leftBase)
    rightSummaryHeightPx.value = Math.max(0, target - rightBase)
  }

  let layoutObserver: ResizeObserver | null = null

  onMounted(() => {
    nextTick(() => {
      updateSummaryHeights()
      if (typeof ResizeObserver !== 'undefined') {
        layoutObserver = new ResizeObserver(() => updateSummaryHeights())
        for (const target of [
          centerStackEl.value,
          leftStatusCardEl.value,
          leftObservedCardEl.value,
          rightStatusCardEl.value,
          rightLatestCardEl.value,
          leftSummaryCardEl.value,
          rightSummaryCardEl.value,
        ]) {
          const el = resolveElement(target)
          if (el) layoutObserver.observe(el)
        }
      }
    })
  })

  onBeforeUnmount(() => {
    layoutObserver?.disconnect()
    layoutObserver = null
  })

  watch([loadingCaudales, loadingHarmoniePredict, loadingEpsPredict], () => {
    nextTick(updateSummaryHeights)
  })

  function close() {
    const query = { ...route.query }
    delete query.station
    router.replace({ query })
  }
</script>

<style scoped>
  .chip-sim-relation {
    background: rgba(255, 255, 255, 0.2) !important;
    color: white !important;
  }
  .chip-sim-relation :deep(.v-chip__prepend .v-icon) {
    color: rgba(255, 255, 255, 0.8);
  }

  .summary-container-card {
    min-height: 0;
    overflow: hidden;
  }

  .chart-tab-root {
    position: relative;
  }

  .chart-tab-overlay {
    position: absolute;
    inset: 0;
  }

  .chart-tab-panel--hidden {
    visibility: hidden;
    pointer-events: none;
  }
</style>
