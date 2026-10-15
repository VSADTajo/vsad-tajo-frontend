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
          :caudal-historical="leftAlertCaudalHistorical"
          :thresholds="activeThresholds"
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
              :embalse-section="embalseObservedSection"
              :caudal-historical="caudalHistorical"
              :caudal-outflow-historical="caudalOutflowHistorical"
              :embalse-volume-historical="embalseVolumeHistorical"
              :thresholds="activeThresholds"
            />
          </v-col>
        </v-row>
      </v-card>

      <v-card
        v-if="!isVolumeTab && !isEntradaTab"
        ref="leftSummaryCardEl"
        class="ma-2 mt-0 pa-2 bg-background w-100 d-flex flex-column summary-container-card"
        elevation="2"
        :style="leftSummaryCardStyle"
      >
        <ContentSaihOperationalSummary
          :loading="loadingCaudales"
          mode="observed"
          :is-embalse="isEmbalse"
          :embalse-section="embalseObservedSection"
          :caudal-historical="caudalHistorical"
          :caudal-outflow-historical="caudalOutflowHistorical"
          :embalse-volume-historical="embalseVolumeHistorical"
          :thresholds="activeThresholds"
          title="Resumen Operativo Observado"
        />
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="8" class="pt-2 pt-md-4 order-1 order-md-2 d-flex flex-column">
      <div ref="centerStackEl" class="w-100 d-flex flex-column">
        <v-card class="bg-background w-100 d-flex flex-column">
          <v-card-text>
            <v-sheet class="pa-2">
              <template v-if="isEmbalse">
                <v-tabs v-model="selectedEmbalseChartTab" density="compact" class="mb-3">
                  <v-tab v-if="hasCaudalNamAvailable" value="caudalEntradaNAM">
                    Caudal Entr. NAM
                  </v-tab>
                  <v-tab v-if="hasCaudalNamAvailable" value="caudalSalidaNAM">
                    Caudal Sal. NAM
                  </v-tab>
                  <v-tab v-if="hasCaudalNamAvailable" value="volumenNAM">Volumen NAM</v-tab>
                  <v-tab v-if="hasCaudalMikeAvailable" value="caudalEntradaMIKE">
                    Caudal Entr. MIKE
                  </v-tab>
                  <v-tab v-if="hasCaudalMikeAvailable" value="caudalSalidaMIKE">
                    Caudal Sal. MIKE
                  </v-tab>
                  <v-tab v-if="hasCaudalMikeAvailable" value="volumenMIKE">Volumen MIKE</v-tab>
                </v-tabs>

                <div class="chart-tab-root">
                  <div
                    :class="[
                      'chart-tab-panel',
                      { 'chart-tab-panel--hidden': selectedEmbalseChartTab !== 'caudalEntradaNAM' },
                    ]"
                  >
                    <ForecastChartNew
                      v-if="mountedTabs.has('caudalEntradaNAM')"
                      :data="caudalEntradaNamChartData"
                      :is-embalse="true"
                      :height="470"
                      :loading="loadingCaudales"
                      :thresholds="thresholds"
                      :hide-caudal-thresholds="true"
                      :focus-threshold-request="thresholdFocusRequest"
                      @focus-threshold-complete="handleThresholdFocusComplete"
                    />
                  </div>
                  <div
                    :class="[
                      'chart-tab-panel',
                      'chart-tab-overlay',
                      { 'chart-tab-panel--hidden': selectedEmbalseChartTab !== 'caudalSalidaNAM' },
                    ]"
                  >
                    <ForecastChartNew
                      v-if="mountedTabs.has('caudalSalidaNAM')"
                      :data="caudalSalidaChartData"
                      :is-embalse="true"
                      :height="470"
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
                      {
                        'chart-tab-panel--hidden': selectedEmbalseChartTab !== 'caudalEntradaMIKE',
                      },
                    ]"
                  >
                    <ForecastChartNew
                      v-if="mountedTabs.has('caudalEntradaMIKE')"
                      :data="mikeChartData"
                      :is-embalse="true"
                      :height="470"
                      :loading="loadingCaudales"
                      :thresholds="thresholds"
                      :hide-caudal-thresholds="true"
                      :focus-threshold-request="thresholdFocusRequest"
                      @focus-threshold-complete="handleThresholdFocusComplete"
                    />
                  </div>
                  <div
                    :class="[
                      'chart-tab-panel',
                      'chart-tab-overlay',
                      { 'chart-tab-panel--hidden': selectedEmbalseChartTab !== 'caudalSalidaMIKE' },
                    ]"
                  >
                    <ForecastChartNew
                      v-if="mountedTabs.has('caudalSalidaMIKE')"
                      :data="caudalSalidaChartData"
                      :is-embalse="true"
                      :height="470"
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
                      { 'chart-tab-panel--hidden': selectedEmbalseChartTab !== 'volumenNAM' },
                    ]"
                  >
                    <ForecastChartNew
                      v-if="mountedTabs.has('volumenNAM')"
                      :data="volumenOnlyChartData"
                      :is-embalse="true"
                      :volume-only="true"
                      :height="470"
                      :loading="loadingCaudales"
                      :thresholds="activeThresholds"
                      :focus-threshold-request="thresholdFocusRequest"
                      @focus-threshold-complete="handleThresholdFocusComplete"
                    />
                  </div>
                  <div
                    :class="[
                      'chart-tab-panel',
                      'chart-tab-overlay',
                      { 'chart-tab-panel--hidden': selectedEmbalseChartTab !== 'volumenMIKE' },
                    ]"
                  >
                    <ForecastChartNew
                      v-if="mountedTabs.has('volumenMIKE')"
                      :data="mikeVolumenChartData"
                      :is-embalse="true"
                      :volume-only="true"
                      :height="470"
                      :loading="loadingCaudales"
                      :thresholds="activeThresholds"
                      :focus-threshold-request="thresholdFocusRequest"
                      @focus-threshold-complete="handleThresholdFocusComplete"
                    />
                  </div>
                </div>
              </template>

              <template v-else>
                <v-tabs v-model="selectedCaudalTypeChartTab" density="compact" class="mb-3">
                  <v-tab v-if="hasCaudalNamAvailable" value="nam">NAM</v-tab>
                  <v-tab v-if="hasCaudalMikeAvailable" value="mike">MIKE</v-tab>
                  <v-tab
                    v-if="hasRole('admin') && hasCaudalNamAvailable && hasCaudalMikeAvailable"
                    value="combined"
                  >
                    NAM + MIKE
                  </v-tab>
                </v-tabs>
                <div class="chart-tab-root">
                  <div
                    :class="[
                      'chart-tab-panel',
                      { 'chart-tab-panel--hidden': selectedCaudalTypeChartTab !== 'nam' },
                    ]"
                  >
                    <ForecastChartNew
                      v-if="mountedTabs.has('nam')"
                      :data="caudalChartData"
                      :loading="loadingCaudales"
                      :thresholds="thresholds"
                      :height="470"
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
                      v-if="mountedTabs.has('mike')"
                      :data="mikeChartData"
                      :loading="loadingCaudales"
                      :thresholds="thresholds"
                      :height="470"
                      :focus-threshold-request="thresholdFocusRequest"
                      @focus-threshold-complete="handleThresholdFocusComplete"
                    />
                  </div>
                  <div
                    :class="[
                      'chart-tab-panel',
                      'chart-tab-overlay',
                      { 'chart-tab-panel--hidden': selectedCaudalTypeChartTab !== 'combined' },
                    ]"
                  >
                    <CombinedNamMikeChart
                      v-if="mountedTabs.has('combined')"
                      :historical="caudalHistorical"
                      :nam-harmonie="caudalForecastHarmonie"
                      :nam-eps="caudalForecastEpstat"
                      :mike-harmonie="mikeForecastHarmonie"
                      :mike-eps="mikeForecastEpsat"
                      :thresholds="thresholds"
                      :loading="loadingCaudales"
                      :height="470"
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
            :active-tab="umbralesActiveTab"
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
            :forecast-ens-p10="isCombinedTab ? undefined : activeEnsP10"
            :forecast-ens-p25="isCombinedTab ? undefined : activeEnsP25"
            :forecast-ens-p75="isCombinedTab ? undefined : activeEnsP75"
            :forecast-ens-p90="isCombinedTab ? undefined : activeEnsP90"
            :forecast-mike-harmonie="isCombinedTab ? mikeForecastHarmonie : undefined"
            :forecast-mike-epsat="isCombinedTab ? mikeForecastEpsat : undefined"
            :thresholds="thresholds"
            :loading="loadingCaudales"
            :title="isVolumeTab ? 'Matriz de volumen (7 dias / 6h)' : undefined"
            :no-thresholds="isVolumeTab || isEntradaTab"
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
          :active-tab="activePredictionsTab"
          :mode="'predictions'"
          :thresholds="activeThresholds"
        />
      </v-card>
      <v-card
        ref="rightLatestCardEl"
        class="ma-2 pa-2 bg-background w-100 flex-shrink-0"
        elevation="2"
      >
        <ContentSaihPredictionsLatest
          class="ma-2"
          :active-tab="activePredictionsTab"
          :loading="loadingCaudales"
          :loading-harmonie="loadingHarmoniePredict"
          :loading-eps="loadingEpsPredict"
          :caudal-forecast-harmonie="activeHarmonieforecast"
          :caudal-forecast-epstat="activeEpsatForecast"
          :selected-harmonie-caudal-date="activeSelectedHarmonieDate"
          :selected-eps-caudal-date="activeSelectedEpsDate"
          :harmonie-caudal-dates="activeHarmonieDates"
          :eps-caudal-dates="activeEpsDates"
          :mike-harmonie-forecast="isCombinedTab ? mikeForecastHarmonie : undefined"
          :mike-epsat-forecast="isCombinedTab ? mikeForecastEpsat : undefined"
          :mike-harmonie-dates="isCombinedTab ? mikeDates : undefined"
          :selected-mike-harmonie-date="isCombinedTab ? selectedMikeDate : undefined"
          :thresholds="activeThresholds"
          @update:selected-harmonie-caudal-date="
            emit('update:selected-harmonie-caudal-date', $event)
          "
          @update:selected-eps-caudal-date="emit('update:selected-eps-caudal-date', $event)"
        />
      </v-card>

      <v-card
        v-if="!isVolumeTab && !isEntradaTab"
        ref="rightSummaryCardEl"
        class="ma-2 mt-0 pa-2 bg-background w-100 d-flex flex-column summary-container-card"
        elevation="2"
        :style="rightSummaryCardStyle"
      >
        <ContentSaihOperationalSummary
          :loading="loadingCaudales"
          mode="predictions"
          :active-tab="activePredictionsTab"
          :caudal-forecast-harmonie="activeHarmonieforecast"
          :caudal-forecast-epstat="activeEpsatForecast"
          :caudal-forecast-ens-p10="activeEnsP10"
          :caudal-forecast-ens-p25="activeEnsP25"
          :caudal-forecast-ens-p75="activeEnsP75"
          :caudal-forecast-ens-p90="activeEnsP90"
          :thresholds="activeThresholds"
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
  import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

  import { useAuth } from '@/composables/useAuth'
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
  import CombinedNamMikeChart from '../charts/CombinedNamMikeChart.vue'

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
    hasCaudalNam?: boolean
    hasCaudalMike?: boolean
  }>()

  const emit = defineEmits<{
    (e: 'update:selected-harmonie-caudal-date', value: string): void
    (e: 'update:selected-eps-caudal-date', value: string): void
  }>()

  const { hasRole } = useAuth()

  // ── UI state ──────────────────────────────────────────────────────────────
  const selectedEmbalseChartTab = ref<
    | 'caudalEntradaNAM'
    | 'caudalSalidaNAM'
    | 'caudalEntradaMIKE'
    | 'caudalSalidaMIKE'
    | 'volumenNAM'
    | 'volumenMIKE'
  >('caudalEntradaNAM')
  const selectedCaudalTypeChartTab = ref<'nam' | 'mike' | 'combined'>('nam')

  const mountedTabs = reactive(new Set<string>(['caudalEntradaNAM', 'nam']))
  watch(selectedEmbalseChartTab, (tab) => mountedTabs.add(tab))
  watch(selectedCaudalTypeChartTab, (tab) => mountedTabs.add(tab))

  // Same hasCaudalNam/hasCaudalMike flags the map uses to show/hide stations
  // — a tab for a model this station doesn't have is never offered here
  // either, closing the gap where the map could hide a station for "no NAM"
  // while the detail view still showed an (empty) NAM tab.
  const hasCaudalNamAvailable = computed(() => props.hasCaudalNam !== false)
  const hasCaudalMikeAvailable = computed(() => props.hasCaudalMike !== false)

  function isEmbalseTabAvailable(tab: string): boolean {
    if (tab.endsWith('NAM')) return hasCaudalNamAvailable.value
    if (tab.endsWith('MIKE')) return hasCaudalMikeAvailable.value
    return true
  }

  // Corrects the selected tab whenever it points at an unavailable model —
  // on first load (immediate) and whenever the station (and therefore its
  // availability flags) changes while this component instance stays mounted.
  watch(
    [hasCaudalNamAvailable, hasCaudalMikeAvailable, () => props.normalizedStationCode],
    () => {
      if (!isEmbalseTabAvailable(selectedEmbalseChartTab.value)) {
        selectedEmbalseChartTab.value = hasCaudalNamAvailable.value
          ? 'caudalEntradaNAM'
          : hasCaudalMikeAvailable.value
            ? 'caudalEntradaMIKE'
            : 'caudalEntradaNAM'
      }

      if (selectedCaudalTypeChartTab.value === 'nam' && !hasCaudalNamAvailable.value) {
        selectedCaudalTypeChartTab.value = hasCaudalMikeAvailable.value ? 'mike' : 'nam'
      } else if (selectedCaudalTypeChartTab.value === 'mike' && !hasCaudalMikeAvailable.value) {
        selectedCaudalTypeChartTab.value = hasCaudalNamAvailable.value ? 'nam' : 'mike'
      } else if (
        selectedCaudalTypeChartTab.value === 'combined' &&
        (!hasCaudalNamAvailable.value || !hasCaudalMikeAvailable.value)
      ) {
        selectedCaudalTypeChartTab.value = hasCaudalNamAvailable.value ? 'nam' : 'mike'
      }
    },
    { immediate: true }
  )
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
    mikeVolumeHarmonie,
    mikeVolumeEpsat,
    mikeVolumeEnsP25,
    mikeVolumeEnsP75,
    namVolumeHarmonie,
    namVolumeEpsat,
    namVolumeEnsP10,
    namVolumeEnsP25,
    namVolumeEnsP75,
    namVolumeEnsP90,
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

  const caudalEntradaNamChartData = computed(() => ({
    historical: caudalHistorical.value,
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

  // No NAM/MIKE forecast exists for caudal de salida — only the observed
  // series — so this one chart data object is shared by both the "Caudal
  // Salida NAM" and "Caudal Salida MIKE" tabs.
  const caudalSalidaChartData = computed(() => ({
    historical: undefined,
    historicalOutflow: caudalOutflowHistorical.value,
    historicalVolume: undefined,
    resguardoVolume: undefined,
    minimumVolume: undefined,
    forecastHarmonie: undefined,
    forecastEpsat: undefined,
    forecastEnsP10: undefined,
    forecastEnsP25: undefined,
    forecastEnsP90: undefined,
    forecastEnsP75: undefined,
  }))

  const volumenOnlyChartData = computed(() => ({
    historical: undefined,
    historicalOutflow: undefined,
    historicalVolume: embalseVolumeHistorical.value,
    resguardoVolume: effectiveResguardoPrediction.value,
    minimumVolume: effectiveMinimoPrediction.value,
    forecastHarmonie: namVolumeHarmonie.value,
    forecastEpsat: namVolumeEpsat.value,
    forecastEnsP10: namVolumeEnsP10.value,
    forecastEnsP25: namVolumeEnsP25.value,
    forecastEnsP90: namVolumeEnsP90.value,
    forecastEnsP75: namVolumeEnsP75.value,
  }))

  const mikeVolumenChartData = computed(() => ({
    historical: undefined,
    historicalOutflow: undefined,
    historicalVolume: embalseVolumeHistorical.value,
    resguardoVolume: effectiveResguardoPrediction.value,
    minimumVolume: effectiveMinimoPrediction.value,
    forecastHarmonie: mikeVolumeHarmonie.value,
    forecastEpsat: mikeVolumeEpsat.value,
    forecastEnsP10: undefined,
    forecastEnsP25: mikeVolumeEnsP25.value,
    forecastEnsP90: undefined,
    forecastEnsP75: mikeVolumeEnsP75.value,
  }))

  // ── Tab-aware props for side panels ───────────────────────────────────────
  const isMikeTab = computed(() => !props.isEmbalse && selectedCaudalTypeChartTab.value === 'mike')
  const isCombinedTab = computed(
    () => !props.isEmbalse && selectedCaudalTypeChartTab.value === 'combined'
  )

  const isEmbalseOnMikeTab = computed(
    () =>
      !!props.isEmbalse &&
      (selectedEmbalseChartTab.value === 'caudalEntradaMIKE' ||
        selectedEmbalseChartTab.value === 'volumenMIKE')
  )

  // No NAM/MIKE forecast exists for caudal de salida — the right-side
  // prediction panels (AlertStatus/PredictionsLatest/OperationalSummary)
  // have nothing to show on these two tabs.
  const isEmbalseOnSalidaTab = computed(
    () =>
      !!props.isEmbalse &&
      (selectedEmbalseChartTab.value === 'caudalSalidaNAM' ||
        selectedEmbalseChartTab.value === 'caudalSalidaMIKE')
  )

  // Drives ContentObservedData/ContentSaihOperationalSummary's left-column
  // "observed" cards so they always show whichever signal the currently
  // selected chart tab is actually displaying, instead of letting
  // ContentObservedData pick independently via its own Entr./Sal./Vol.
  // toggle.
  const embalseObservedSection = computed<'entrada' | 'salida' | 'volumen' | undefined>(() => {
    if (!props.isEmbalse) return undefined
    if (
      selectedEmbalseChartTab.value === 'caudalEntradaNAM' ||
      selectedEmbalseChartTab.value === 'caudalEntradaMIKE'
    ) {
      return 'entrada'
    }
    if (
      selectedEmbalseChartTab.value === 'caudalSalidaNAM' ||
      selectedEmbalseChartTab.value === 'caudalSalidaMIKE'
    ) {
      return 'salida'
    }
    return 'volumen'
  })

  const isVolumeTab = computed(
    () =>
      !!props.isEmbalse &&
      (selectedEmbalseChartTab.value === 'volumenNAM' ||
        selectedEmbalseChartTab.value === 'volumenMIKE')
  )

  // Caudal de salida has no forecast either, so it's not "volumen" but it's
  // not a regular caudal forecast view either — ContentSaihCaudalMatrix and
  // the umbrales card key off isEntradaTab/isVolumeTab/isEmbalseOnSalidaTab
  // directly rather than needing a fourth activePredictionsTab value.
  const isEntradaTab = computed(
    () =>
      !!props.isEmbalse &&
      (selectedEmbalseChartTab.value === 'caudalEntradaNAM' ||
        selectedEmbalseChartTab.value === 'caudalEntradaMIKE')
  )

  const activePredictionsTab = computed((): 'caudal' | 'volumen' =>
    isVolumeTab.value ? 'volumen' : 'caudal'
  )

  // ContentUmbralesData's activeTab prop expects embalse's own
  // caudalEntradaNAM/caudalSalidaNAM/etc. values, but for an aforo (non-
  // embalse) station the real selected tab lives in
  // selectedCaudalTypeChartTab ('nam'/'mike'/'combined') — passing
  // selectedEmbalseChartTab unconditionally left it stuck at its embalse
  // default ('caudalEntradaNAM'), which happens to be one of
  // ContentUmbralesData's hidden tabs, silently suppressing the threshold
  // chips for every aforo station.
  const umbralesActiveTab = computed(() => {
    if (props.isEmbalse) return selectedEmbalseChartTab.value
    return selectedCaudalTypeChartTab.value === 'mike' ? 'caudalMIKE' : 'caudalNAM'
  })

  // An embalse's real thresholds (umbral_caudal_*) are defined for caudal
  // de salida only — volumen has no populated threshold at all, and
  // entrada has nothing valid to compare against (same numbers, wrong
  // physical quantity). Both tabs get no thresholds at all rather than a
  // misleading comparison: AlertStatus/PredictionsLatest fall back to their
  // own "no threshold" NORMAL/uncolored state, and OperationalSummary is
  // hidden outright (nothing valid for it to report).
  const activeThresholds = computed<Record<string, unknown> | undefined>(() =>
    isVolumeTab.value || isEntradaTab.value ? undefined : props.thresholds
  )

  // The left "observed" AlertStatus card otherwise always read entrada's
  // value even while the chart (and ContentObservedData) show salida —
  // comparing the wrong signal against the (salida) thresholds.
  const leftAlertCaudalHistorical = computed(() => {
    if (!props.isEmbalse) return caudalHistorical.value
    return embalseObservedSection.value === 'salida'
      ? caudalOutflowHistorical.value
      : caudalHistorical.value
  })

  const activeHarmonieforecast = computed(() => {
    if (props.isEmbalse) {
      if (selectedEmbalseChartTab.value === 'caudalEntradaNAM') return caudalForecastHarmonie.value
      if (selectedEmbalseChartTab.value === 'caudalEntradaMIKE') return mikeForecastHarmonie.value
      if (selectedEmbalseChartTab.value === 'volumenNAM') return namVolumeHarmonie.value
      if (selectedEmbalseChartTab.value === 'volumenMIKE') return mikeVolumeHarmonie.value
      return undefined
    }
    return isMikeTab.value ? mikeForecastHarmonie.value : caudalForecastHarmonie.value
  })
  const activeEpsatForecast = computed(() => {
    if (props.isEmbalse) {
      if (selectedEmbalseChartTab.value === 'caudalEntradaNAM') return caudalForecastEpstat.value
      if (selectedEmbalseChartTab.value === 'caudalEntradaMIKE') return mikeForecastEpsat.value
      if (selectedEmbalseChartTab.value === 'volumenNAM') return namVolumeEpsat.value
      if (selectedEmbalseChartTab.value === 'volumenMIKE') return mikeVolumeEpsat.value
      return undefined
    }
    return isMikeTab.value ? mikeForecastEpsat.value : caudalForecastEpstat.value
  })
  const activeEnsP10 = computed(() => {
    if (props.isEmbalse) {
      if (selectedEmbalseChartTab.value === 'caudalEntradaNAM') return caudalForecastEnsP10.value
      if (selectedEmbalseChartTab.value === 'volumenNAM') return namVolumeEnsP10.value
      return undefined
    }
    return isMikeTab.value ? undefined : caudalForecastEnsP10.value
  })
  const activeEnsP25 = computed(() => {
    if (props.isEmbalse) {
      if (selectedEmbalseChartTab.value === 'caudalEntradaNAM') return caudalForecastEnsP25.value
      if (selectedEmbalseChartTab.value === 'caudalEntradaMIKE') return mikeForecastEnsP25.value
      if (selectedEmbalseChartTab.value === 'volumenNAM') return namVolumeEnsP25.value
      if (selectedEmbalseChartTab.value === 'volumenMIKE') return mikeVolumeEnsP25.value
      return undefined
    }
    return isMikeTab.value ? mikeForecastEnsP25.value : caudalForecastEnsP25.value
  })
  const activeEnsP75 = computed(() => {
    if (props.isEmbalse) {
      if (selectedEmbalseChartTab.value === 'caudalEntradaNAM') return caudalForecastEnsP75.value
      if (selectedEmbalseChartTab.value === 'caudalEntradaMIKE') return mikeForecastEnsP75.value
      if (selectedEmbalseChartTab.value === 'volumenNAM') return namVolumeEnsP75.value
      if (selectedEmbalseChartTab.value === 'volumenMIKE') return mikeVolumeEnsP75.value
      return undefined
    }
    return isMikeTab.value ? mikeForecastEnsP75.value : caudalForecastEnsP75.value
  })
  const activeEnsP90 = computed(() => {
    if (props.isEmbalse) {
      if (selectedEmbalseChartTab.value === 'caudalEntradaNAM') return caudalForecastEnsP90.value
      if (selectedEmbalseChartTab.value === 'volumenNAM') return namVolumeEnsP90.value
      return undefined
    }
    return isMikeTab.value ? undefined : caudalForecastEnsP90.value
  })

  const activeHarmonieDates = computed(() => {
    if (props.isEmbalse) {
      if (isEmbalseOnSalidaTab.value) return []
      return isEmbalseOnMikeTab.value ? mikeDates.value : harmonieCaudalDates.value
    }
    return isMikeTab.value ? mikeDates.value : harmonieCaudalDates.value
  })
  const activeEpsDates = computed(() => {
    if (props.isEmbalse) {
      if (isEmbalseOnSalidaTab.value) return []
      return isEmbalseOnMikeTab.value ? [] : epsCaudalDates.value
    }
    return isMikeTab.value ? [] : epsCaudalDates.value
  })
  const activeSelectedHarmonieDate = computed(() => {
    if (props.isEmbalse) {
      if (isEmbalseOnSalidaTab.value) return ''
      return isEmbalseOnMikeTab.value ? selectedMikeDate.value : selectedHarmonieCaudalDate.value
    }
    return isMikeTab.value ? selectedMikeDate.value : selectedHarmonieCaudalDate.value
  })
  const activeSelectedEpsDate = computed(() => {
    if (props.isEmbalse) {
      if (isEmbalseOnSalidaTab.value) return ''
      return isEmbalseOnMikeTab.value ? '' : selectedEpsCaudalDate.value
    }
    return isMikeTab.value ? '' : selectedEpsCaudalDate.value
  })

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
