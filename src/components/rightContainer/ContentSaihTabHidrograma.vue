<template>
  <v-row justify="center" class="px-3 align-stretch">
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
          :thresholds="thresholds"
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
              :caudal-historical="caudalHistorical"
              :caudal-outflow-historical="caudalOutflowHistorical"
              :embalse-volume-historical="embalseVolumeHistorical"
              :thresholds="thresholds"
            />
          </v-col>
        </v-row>
      </v-card>

      <v-card
        ref="leftSummaryCardEl"
        class="ma-2 mt-0 pa-2 bg-background w-100 d-flex flex-column summary-container-card"
        elevation="2"
        :style="leftSummaryCardStyle"
      >
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
      <div ref="centerStackEl" class="w-100 d-flex flex-column">
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
                <v-tabs v-model="selectedCaudalTypeChartTab" density="compact" class="mb-3">
                  <v-tab value="nam">NAM</v-tab>
                  <v-tab value="mike">MIKE</v-tab>
                </v-tabs>
                <div class="chart-tab-root">
                  <div
                    :class="[
                      'chart-tab-panel',
                      { 'chart-tab-panel--hidden': selectedCaudalTypeChartTab !== 'nam' },
                    ]"
                  >
                    <ForecastChartNew
                      :data="caudalChartData"
                      :loading="loadingCaudales"
                      :thresholds="thresholds"
                      :focus-threshold-request="thresholdFocusRequest"
                      @focus-threshold-complete="handleThresholdFocusComplete"
                    />
                  </div>
                  <div
                    :class="[
                      'chart-tab-panel',
                      'chart-tab-overlay',
                      { 'chart-tab-panel--hidden': selectedCaudalTypeChartTab !== 'mike' },
                    ]"
                  >
                    <ForecastChartNew
                      :data="mikeChartData"
                      :loading="loadingCaudales"
                      :thresholds="thresholds"
                      :focus-threshold-request="thresholdFocusRequest"
                      @focus-threshold-complete="handleThresholdFocusComplete"
                    />
                  </div>
                </div>
              </template>
            </v-sheet>
          </v-card-text>
        </v-card>

        <v-card class="mt-2 pa-2 bg-background" elevation="2">
          <ContentUmbralesData
            :active-tab="selectedEmbalseChartTab"
            :is-embalse="isEmbalse"
            :thresholds="thresholds"
            :selected-threshold="selectedThreshold"
            @focus-threshold="handleThresholdFocus"
          />
        </v-card>

        <v-card class="pa-2 bg-background mt-2" elevation="2">
          <ContentSaihCaudalMatrix
            :forecast-harmonie="activeHarmonieforecast"
            :forecast-epsat="activeEpsatForecast"
            :thresholds="thresholds"
            :loading="loadingCaudales"
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
          :caudal-forecast-harmonie="activeHarmonieforecast"
          :caudal-forecast-epsat="activeEpsatForecast"
          :mode="'predictions'"
          :thresholds="thresholds"
        />
      </v-card>
      <v-card
        ref="rightLatestCardEl"
        class="ma-2 pa-2 bg-background w-100 flex-shrink-0"
        elevation="2"
      >
        <ContentSaihPredictionsLatest
          class="ma-2"
          active-tab="caudal"
          :loading="loadingCaudales"
          :loading-harmonie="loadingHarmoniePredict"
          :loading-eps="loadingEpsPredict"
          :caudal-forecast-harmonie="activeHarmonieforecast"
          :caudal-forecast-epstat="activeEpsatForecast"
          :selected-harmonie-caudal-date="activeSelectedHarmonieDate"
          :selected-eps-caudal-date="activeSelectedEpsDate"
          :harmonie-caudal-dates="activeHarmonieDates"
          :eps-caudal-dates="activeEpsDates"
          :thresholds="thresholds"
          @update:selected-harmonie-caudal-date="
            emit('update:selected-harmonie-caudal-date', $event)
          "
          @update:selected-eps-caudal-date="emit('update:selected-eps-caudal-date', $event)"
        />
      </v-card>

      <v-card
        ref="rightSummaryCardEl"
        class="ma-2 mt-0 pa-2 bg-background w-100 d-flex flex-column summary-container-card"
        elevation="2"
        :style="rightSummaryCardStyle"
      >
        <ContentSaihOperationalSummary
          :loading="loadingCaudales"
          mode="predictions"
          :caudal-forecast-harmonie="activeHarmonieforecast"
          :caudal-forecast-epstat="activeEpsatForecast"
          :caudal-forecast-ens-p10="activeEnsP10"
          :caudal-forecast-ens-p25="activeEnsP25"
          :caudal-forecast-ens-p75="activeEnsP75"
          :caudal-forecast-ens-p90="activeEnsP90"
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
          :resguardos-data="resguardosApiData"
          :loading="loadingResguardos"
        />
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

  import { useCaudalPredictions } from '@/composables/useCaudalPredictions'
  import { useResguardos } from '@/composables/useResguardos'

  import ContentSaihAlertStatus from './ContentSaih/ContentSaihAlertStatus.vue'
  import ForecastChartNew from '../charts/ForecastChartNew.vue'
  import ContentObservedData from './ContentSaih/ContentObservedData.vue'
  import ContentSaihOperationalSummary from './ContentSaih/ContentSaihOperationalSummary.vue'
  import ContentUmbralesData from './ContentSaih/ContentUmbralesData.vue'
  import ContentSaihCaudalMatrix from './ContentSaih/ContentSaihCaudalMatrix.vue'
  import ContentSaihPredictionsLatest from './ContentSaih/ContentSaihPredictionsLatest.vue'
  import ContentSaihResguardosData from './ContentSaih/ContentSaihResguardosData.vue'
  import ContentSaihResguardosChart from './ContentSaih/ContentSaihResguardosChart.vue'

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

  // ── UI state ──────────────────────────────────────────────────────────────
  const selectedEmbalseChartTab = ref<'caudal' | 'volumen'>('caudal')
  const selectedCaudalTypeChartTab = ref<'nam' | 'mike'>('nam')
  const selectedThreshold = ref<ThresholdSelection>(null)
  const thresholdFocusRequest = ref<ThresholdFocusRequest | null>(null)
  const thresholdFocusNonce = ref(0)
  // ── Composable args ───────────────────────────────────────────────────────
  const codeType = computed(() => {
    const val = props.thresholds?.tipoCod
    return typeof val === 'string' ? val : undefined
  })

  // ── Data composables ──────────────────────────────────────────────────────
  const {
    caudalHistorical,
    caudalForecastHarmonie,
    caudalForecastEpstat,
    caudalForecastEnsP10,
    caudalForecastEnsP25,
    caudalForecastEnsP75,
    caudalForecastEnsP90,
    caudalOutflowHistorical,
    embalseVolumeHistorical,
    mikeForecastHarmonie,
    mikeForecastEpsat,
    mikeForecastEnsP25,
    mikeForecastEnsP75,
    mikeChartData,
    harmonieCaudalDates,
    epsCaudalDates,
    mikeDates,
    selectedHarmonieCaudalDate,
    selectedEpsCaudalDate,
    selectedMikeDate,
    loading: loadingCaudales,
    loadingHarmoniePredict,
    loadingEpsPredict,
  } = useCaudalPredictions(
    computed(() => props.normalizedStationCode),
    computed(() => props.isEmbalse),
    codeType
  )

  const {
    resguardosApiData,
    loadingResguardos,
    effectiveResguardoPrediction,
    effectiveMinimoPrediction,
    editedResguardoPrediction,
    editedMinimoPrediction,
  } = useResguardos(
    computed(() => props.normalizedStationCode),
    computed(() => props.isEmbalse)
  )

  // ── Chart data (composable refs + resguardos merged) ──────────────────────
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

  // ── Tab-aware props for side panels ───────────────────────────────────────
  const isMikeTab = computed(() => !props.isEmbalse && selectedCaudalTypeChartTab.value === 'mike')

  const activeHarmonieforecast = computed(() =>
    isMikeTab.value ? mikeForecastHarmonie.value : caudalForecastHarmonie.value
  )
  const activeEpsatForecast = computed(() =>
    isMikeTab.value ? mikeForecastEpsat.value : caudalForecastEpstat.value
  )
  const activeEnsP10 = computed(() => (isMikeTab.value ? undefined : caudalForecastEnsP10.value))
  const activeEnsP25 = computed(() =>
    isMikeTab.value ? mikeForecastEnsP25.value : caudalForecastEnsP25.value
  )
  const activeEnsP75 = computed(() =>
    isMikeTab.value ? mikeForecastEnsP75.value : caudalForecastEnsP75.value
  )
  const activeEnsP90 = computed(() => (isMikeTab.value ? undefined : caudalForecastEnsP90.value))

  const activeHarmonieDates = computed(() =>
    isMikeTab.value ? mikeDates.value : harmonieCaudalDates.value
  )
  const activeEpsDates = computed(() => (isMikeTab.value ? [] : epsCaudalDates.value))
  const activeSelectedHarmonieDate = computed(() =>
    isMikeTab.value ? selectedMikeDate.value : selectedHarmonieCaudalDate.value
  )
  const activeSelectedEpsDate = computed(() => (isMikeTab.value ? '' : selectedEpsCaudalDate.value))

  // ── Threshold focus ───────────────────────────────────────────────────────
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

  function handleThresholdFocusComplete(): void {
    // Selection stays active until the user toggles it off.
  }

  // ── Layout height management ──────────────────────────────────────────────
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
        const observed = [
          centerStackEl.value,
          leftStatusCardEl.value,
          leftObservedCardEl.value,
          rightStatusCardEl.value,
          rightLatestCardEl.value,
          leftSummaryCardEl.value,
          rightSummaryCardEl.value,
        ]

        for (const target of observed) {
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

  watch(
    [
      loadingCaudales,
      loadingHarmoniePredict,
      loadingEpsPredict,
      selectedEmbalseChartTab,
      () => props.isEmbalse,
    ],
    () => {
      nextTick(updateSummaryHeights)
    }
  )
</script>

<style scoped>
  .summary-container-card {
    min-height: 0;
    overflow: hidden;
  }

  .chart-tab-root {
    position: relative;
  }

  /* MIKE chart sits on top of NAM, filling the same space */
  .chart-tab-overlay {
    position: absolute;
    inset: 0;
  }

  /* visibility keeps layout/dimensions intact — ECharts can always read container size */
  .chart-tab-panel--hidden {
    visibility: hidden;
    pointer-events: none;
  }
</style>
