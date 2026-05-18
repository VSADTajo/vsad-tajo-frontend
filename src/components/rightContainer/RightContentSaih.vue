<template>
  <div
    v-if="loadingFeature || feature"
    class="d-flex justify-space-between align-start pa-4 saih-sticky-header"
    :style="topHeaderStyle"
  >
    <div v-if="feature">
      <div class="text-h6 font-weight-bold" style="color: white">
        {{ feature.properties?.codigo }}
      </div>
      <div class="text-caption" style="color: rgba(255, 255, 255, 0.9)">
        {{ feature.properties?.nombre }}
      </div>
    </div>
    <div v-else>
      <div class="text-h6 font-weight-bold" style="color: white">Cargando estacion</div>
      <div class="text-caption" style="color: rgba(255, 255, 255, 0.9)">Recuperando datos...</div>
    </div>

    <v-btn icon="mdi-close" variant="text" size="small" style="color: white" @click="closeDrawer" />
  </div>

  <v-card class="bg-background" elevation="2">
    <v-progress-linear v-if="loadingFeature" indeterminate />

    <!-- Skeleton while loading feature -->
    <template v-if="loadingFeature">
      <div class="pa-4">
        <v-skeleton-loader type="heading" height="28" class="mb-2" />
        <v-skeleton-loader type="text" height="18" class="mb-2" />
        <v-skeleton-loader type="list-item" class="mb-2" />
      </div>
    </template>

    <template v-else-if="feature">
      <v-card-text class="pt-1">
        <!-- Tipo -->
        <div class="mb-2 mt-2">
          <v-chip
            :icon="feature?.properties?.tipo === 'SAIH' ? 'mdi-water' : 'mdi-map-marker'"
            :color="stationBaseColor"
            variant="tonal"
            size="small"
            class="font-weight-bold"
          >
            {{ feature?.properties?.stationType }}
          </v-chip>
        </div>

        <!-- Información -->
        <ContentSaihInfo :feature="feature" />
      </v-card-text>
    </template>

    <v-alert v-if="error" type="error" variant="tonal">
      {{ error }}
    </v-alert>
  </v-card>

  <v-row class="mt-2 align-stretch">
    <v-col cols="12" md="3" lg="2" class="order-2 order-md-1 d-flex">
      <v-card class="ma-2 pa-2 bg-background w-100 h-100 d-flex flex-column" elevation="2">
        <v-row>
          <v-col cols="6" md="12">
            <ContentObservedData
              :active-tab="tab"
              :loading="sidePanelsLoading"
              :is-embalse="isEmbalse"
              :caudal-historical="caudalHistorical"
              :caudal-outflow-historical="caudalOutflowHistorical"
              :embalse-volume-historical="embalseVolumeHistorical"
              :precipitations-historical="precipitationsHistorical"
              :thresholds="feature?.properties as Record<string, unknown>"
            />
          </v-col>
        </v-row>
      </v-card>
    </v-col>
    <v-col cols="12" md="6" lg="8" class="pt-2 pt-md-4 order-1 order-md-2 d-flex">
      <div class="w-100 d-flex flex-column">
        <v-card class="bg-background w-100 h-100 d-flex flex-column">
          <v-card-text>
            <v-sheet elevation="2">
              <v-tabs v-model="tab" color="primary">
                <v-tab v-if="hasCaudal" value="caudal">Hidrograma</v-tab>
                <v-tab value="precipitaciones">Precipitaciones</v-tab>
              </v-tabs>

              <v-divider></v-divider>

              <v-tabs-window v-model="tab">
                <v-tabs-window-item v-if="hasCaudal" value="caudal" eager>
                  <v-sheet
                    v-if="
                      loadingCaudales ||
                      caudalHistorical ||
                      caudalForecastHarmonie ||
                      caudalForecastEpstat
                    "
                    class="pa-5"
                  >
                    <ForecastChartNew
                      :data="caudalChartData"
                      :loading="loadingCaudales || chartThresholdActionLoading"
                      :thresholds="feature?.properties as Record<string, unknown>"
                      :focus-threshold-request="focusThresholdRequest"
                      @focus-threshold-complete="chartThresholdActionLoading = false"
                    />
                    <!-- <ForecastChartNewEcharts :data="caudalChartData" /> -->
                  </v-sheet>
                  <!-- show skeleton while loading and keep reserved height to avoid layout jumps -->
                  <div
                    v-else-if="loadingCaudales || loadingPrecipitaciones"
                    class="chart-placeholder chart-placeholder--caudal"
                  >
                    <v-skeleton-loader style="width: 100%; height: 100%" type="image" />
                  </div>

                  <div
                    v-else-if="
                      !loadingCaudales &&
                      (hasSelectedDateForTab || !availableDates.simulationDates.length)
                    "
                    class="chart-placeholder chart-placeholder--caudal"
                  >
                    No hay Datos de Caudales Disponibles
                  </div>
                </v-tabs-window-item>

                <v-tabs-window-item value="precipitaciones" eager>
                  <v-sheet
                    v-if="
                      loadingPrecipitaciones ||
                      precipitationsHistorical ||
                      precipitationsForecastHarmonie ||
                      precipitationsForecastEpstat
                    "
                    class="pa-5"
                  >
                    <PrecipitationsChart
                      :data="precipitationsChartData"
                      :loading="loadingPrecipitaciones"
                    />
                    <!-- <PrecipitationsChartEcharts :data="precipitationsChartData" /> -->
                  </v-sheet>

                  <!-- show skeleton while loading and keep reserved height to avoid layout jumps -->
                  <div
                    v-else-if="loadingPrecipitaciones || loadingCaudales"
                    class="chart-placeholder chart-placeholder--precip"
                  >
                    <v-skeleton-loader style="width: 100%; height: 100%" type="image" />
                  </div>

                  <div
                    v-else-if="
                      !loadingPrecipitaciones &&
                      (hasSelectedDateForTab || !availableDates.simulationDates.length)
                    "
                    class="chart-placeholder chart-placeholder--precip"
                  >
                    No hay Datos de Precipitaciones Disponibles
                  </div>
                </v-tabs-window-item>
              </v-tabs-window>
            </v-sheet>
          </v-card-text>
        </v-card>

        <v-card class="mt-2 pa-2 bg-background" elevation="2">
          <ContentUmbralesData
            :active-tab="tab"
            :is-embalse="isEmbalse"
            :thresholds="feature?.properties as Record<string, unknown>"
            :selected-threshold="selectedThreshold"
            @focus-threshold="handleThresholdFocus"
          />
        </v-card>
      </div>
    </v-col>
    <v-col cols="12" md="3" lg="2" class="order-3 order-md-3 d-flex">
      <v-card class="ma-2 pa-2 bg-background w-100 h-100 d-flex flex-column" elevation="2">
        <v-row>
          <v-col cols="6" md="12">
            <ContentSaihPredictionsLatest
              :active-tab="tab"
              :loading="sidePanelsLoading"
              :loading-harmonie="loadingHarmoniePredict"
              :loading-eps="loadingEpsPredict"
              :caudal-forecast-harmonie="caudalForecastHarmonie"
              :caudal-forecast-epstat="caudalForecastEpstat"
              :precipitations-forecast-harmonie="precipitationsForecastHarmonie"
              :precipitations-forecast-epstat="precipitationsForecastEpstat"
              :selected-harmonie-caudal-date="selectedHarmonieCaudalDate"
              :selected-harmonie-precip-date="selectedHarmoniePrecipDate"
              :selected-eps-caudal-date="selectedEpsCaudalDate"
              :selected-eps-precip-date="selectedEpsPrecipDate"
              :harmonie-caudal-dates="harmonieCaudalDates"
              :harmonie-precip-dates="harmoniePrecipDates"
              :eps-caudal-dates="epsCaudalDates"
              :eps-precip-dates="epsPrecipDates"
              :thresholds="feature?.properties as Record<string, unknown>"
              @update:selected-harmonie-caudal-date="selectedHarmonieCaudalDate = $event"
              @update:selected-harmonie-precip-date="selectedHarmoniePrecipDate = $event"
              @update:selected-eps-caudal-date="selectedEpsCaudalDate = $event"
              @update:selected-eps-precip-date="selectedEpsPrecipDate = $event"
            />
          </v-col>
          <!-- <v-col cols="6" md="12">
            <ContentSaihPredictionsWeek />
          </v-col> -->
        </v-row>
      </v-card>
    </v-col>
  </v-row>

  <v-row class="px-2">
    <v-col v-if="tab === 'caudal'" cols="12" class="mb-2 mb-md-0">
      <v-card class="pa-2 bg-background" elevation="2">
        <ContentSaihCaudalMatrix
          :forecast-harmonie="caudalForecastHarmonie"
          :forecast-epsat="caudalForecastEpstat"
          :thresholds="feature?.properties as Record<string, unknown>"
          :loading="matrixLoading"
        />
      </v-card>
    </v-col>

    <v-col v-else cols="12" class="px-2 mb-2 mb-md-0">
      <v-card class="pa-2 bg-background" elevation="2">
        <ContentSaihCaudalMatrix
          :forecast-harmonie="precipitationsForecastHarmonie"
          :forecast-epsat="precipitationsForecastEpstat"
          :loading="matrixLoading"
          title="Matriz de precipitaciones (7 dias / 6h)"
          no-thresholds
        />
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
  import { ref, computed, watch, type Ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { api } from '@/services/api'
  import type {
    AvailableDateItem,
    DataStationPrediction,
    DatesAvailableResponse,
    PredictionTypeName,
    StationPrediction,
  } from '@/types/Predictions'
  import PrecipitationsChart from '../charts/PrecipitationsChart.vue'
  import { getAvailablePredictionsService, getPredictionsService } from '@/services/predictions'
  import ForecastChartNew from '../charts/ForecastChartNew.vue'
  import { getSaihTypeColor } from '@/utils/saihStations'
  import ContentSaihInfo from './ContentSaih/ContentSaihInfo.vue'
  import ContentObservedData from './ContentSaih/ContentObservedData.vue'
  import ContentSaihCaudalMatrix from './ContentSaih/ContentSaihCaudalMatrix.vue'
  import ContentSaihPredictionsLatest from './ContentSaih/ContentSaihPredictionsLatest.vue'
  import {
    aforosWithCaudalPredictions,
    embalsesWithCaudalPredictions,
  } from '@/constants/predictionsAvailableData'
  import ContentUmbralesData from './ContentSaih/ContentUmbralesData.vue'

  const route = useRoute()
  const router = useRouter()

  const feature = ref<GeoJSON.Feature | null>(null)
  const loadingFeature = ref(false)
  const loadingPrecipitaciones = ref(false)
  const loadingCaudales = ref(true)
  const error = ref<string | null>(null)

  const precipitationsForecastEpstat = ref<StationPrediction>()
  const precipitationsForecastHarmonie = ref<StationPrediction>()

  const precipitationsForecastEnsP10 = ref<StationPrediction>()
  const precipitationsForecastEnsP25 = ref<StationPrediction>()
  const precipitationsForecastEnsP75 = ref<StationPrediction>()
  const precipitationsForecastEnsP90 = ref<StationPrediction>()
  const precipitationsHistorical = ref<StationPrediction>()

  const caudalForecastEpstat = ref<StationPrediction>()
  const caudalForecastHarmonie = ref<StationPrediction>()

  const caudalForecastEnsP10 = ref<StationPrediction>()
  const caudalForecastEnsP25 = ref<StationPrediction>()
  const caudalForecastEnsP75 = ref<StationPrediction>()
  const caudalForecastEnsP90 = ref<StationPrediction>()
  const caudalHistorical = ref<StationPrediction>()
  const caudalOutflowHistorical = ref<StationPrediction>()
  const embalseVolumeHistorical = ref<StationPrediction>()

  const availableDates = ref<DatesAvailableResponse>({ simulationDates: [], totalResults: 0 })
  const selectedObservedCaudalDate = ref<string>('')
  const selectedObservedPrecipDate = ref<string>('')
  const selectedHarmonieCaudalDate = ref<string>('')
  const selectedHarmoniePrecipDate = ref<string>('')
  const selectedEpsCaudalDate = ref<string>('')
  const selectedEpsPrecipDate = ref<string>('')

  // station desde la URL
  const stationCode = computed(() => route.query.station as string | undefined)

  const codeType = computed(() => feature.value?.properties?.tipoCod)

  function hexToRgb(hex: string): [number, number, number] {
    const value = hex.replace('#', '')
    const full =
      value.length === 3
        ? value
            .split('')
            .map((c) => c + c)
            .join('')
        : value
    const num = Number.parseInt(full, 16)

    return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
  }

  function shadeHex(hex: string, factor: number): string {
    const [r, g, b] = hexToRgb(hex)
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

    const rr = clamp(r * factor)
    const gg = clamp(g * factor)
    const bb = clamp(b * factor)

    return `rgb(${rr}, ${gg}, ${bb})`
  }

  const stationBaseColor = computed(() => getSaihTypeColor(codeType.value as string | undefined))

  const headerStyle = computed(() => {
    const base = stationBaseColor.value
    const darker = shadeHex(base, 0.72)

    return {
      background: `linear-gradient(135deg, ${base} 0%, ${darker} 100%)`,
    }
  })

  const topHeaderStyle = computed(() => {
    if (feature.value) return headerStyle.value

    return {
      background: 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)',
    }
  })

  const stationsWithCaudalPredictions = new Set([
    ...aforosWithCaudalPredictions,
    ...embalsesWithCaudalPredictions,
  ])

  const normalizedStationCode = computed(() => {
    const featureProperties = (feature.value?.properties ?? {}) as Record<string, unknown>
    const featureCode = featureProperties.stationCode ?? featureProperties.codigo
    const sourceCode = typeof featureCode === 'string' ? featureCode : stationCode.value

    return sourceCode?.trim().toUpperCase() ?? ''
  })

  const hasCaudal = computed(() => stationsWithCaudalPredictions.has(normalizedStationCode.value))
  const embalseCodes = new Set(embalsesWithCaudalPredictions)
  const isEmbalse = computed(() => embalseCodes.has(normalizedStationCode.value))

  const tab = ref<'caudal' | 'precipitaciones'>(hasCaudal.value ? 'caudal' : 'precipitaciones')

  let featureRequestId = 0
  let predictionsRequestId = 0
  let skipNextSimulationWatch = false
  const loadingInitialData = ref(false)
  const loadingMatrixOnPredictionSelect = ref(false)
  const loadingHarmoniePredict = ref(false)
  const loadingEpsPredict = ref(false)
  const chartThresholdActionLoading = ref(false)
  const focusThresholdRequest = ref<ThresholdFocusRequest>(null)
  const selectedThreshold = ref<ThresholdSelection>(null)

  function handleThresholdFocus(payload: ThresholdSelection): void {
    chartThresholdActionLoading.value = true

    if (!payload) {
      selectedThreshold.value = null
      focusThresholdRequest.value = {
        action: 'reset',
        nonce: Date.now(),
      }
      return
    }

    selectedThreshold.value = payload
    focusThresholdRequest.value = {
      action: 'focus',
      kind: payload.kind,
      level: payload.level,
      nonce: Date.now(),
    }
  }

  type ForecastKey = keyof DataStationPrediction
  type ForecastRefsMap = Record<ForecastKey, Ref<StationPrediction | undefined>>
  type ForecastRequestDef = {
    key: ForecastKey
    predictionType: PredictionTypeName
    simulationDate?: string
    percentile?: string
  }

  type ThresholdKind = 'caudal' | 'volumen'
  type ThresholdLevel = 1 | 2 | 3
  type ThresholdSelection = { kind: ThresholdKind; level: ThresholdLevel } | null
  type ThresholdFocusRequest = {
    action: 'focus' | 'reset'
    kind?: ThresholdKind
    level?: ThresholdLevel
    nonce: number
  } | null

  type StationByCodeResponse = {
    id: string
    name: string
    stationCode: string
    stationType: string
    tipoCod?: string | null
    latitude: number | null
    longitude: number | null
    threshold?: {
      umbralNivel1?: number | null
      umbralNivel2?: number | null
      umbralNivel3?: number | null
      umbralCaudal1?: number | null
      umbralCaudal2?: number | null
      umbralCaudal3?: number | null
      [key: string]: unknown
    } | null
    [key: string]: unknown
  }

  const observedCaudalDates = ref<string[]>([])
  const observedPrecipDates = ref<string[]>([])
  const harmonieCaudalDates = ref<string[]>([])
  const harmoniePrecipDates = ref<string[]>([])
  const epsCaudalDates = ref<string[]>([])
  const epsPrecipDates = ref<string[]>([])

  const hasSelectedDateForTab = computed(() =>
    tab.value === 'caudal'
      ? Boolean(
          selectedObservedCaudalDate.value ||
          selectedHarmonieCaudalDate.value ||
          selectedEpsCaudalDate.value
        )
      : Boolean(
          selectedObservedPrecipDate.value ||
          selectedHarmoniePrecipDate.value ||
          selectedEpsPrecipDate.value
        )
  )

  const sidePanelsLoading = computed(() => loadingFeature.value || loadingInitialData.value)

  const matrixLoading = computed(
    () => loadingFeature.value || loadingInitialData.value || loadingMatrixOnPredictionSelect.value
  )

  const precipitationRefs: ForecastRefsMap = {
    historical: precipitationsHistorical,
    forecastHarmonie: precipitationsForecastHarmonie,
    forecastEpsat: precipitationsForecastEpstat,
    forecastEnsP10: precipitationsForecastEnsP10,
    forecastEnsP25: precipitationsForecastEnsP25,
    forecastEnsP75: precipitationsForecastEnsP75,
    forecastEnsP90: precipitationsForecastEnsP90,
  }

  const caudalRefs: ForecastRefsMap = {
    historical: caudalHistorical,
    forecastHarmonie: caudalForecastHarmonie,
    forecastEpsat: caudalForecastEpstat,
    forecastEnsP10: caudalForecastEnsP10,
    forecastEnsP25: caudalForecastEnsP25,
    forecastEnsP75: caudalForecastEnsP75,
    forecastEnsP90: caudalForecastEnsP90,
  }

  const precipitationRequests = computed<ForecastRequestDef[]>(() => [
    {
      key: 'historical',
      predictionType: 'WI__01.historical',
      simulationDate: selectedObservedPrecipDate.value,
    },
    {
      key: 'forecastEpsat',
      predictionType: 'P.ens.forecast',
      simulationDate: selectedEpsPrecipDate.value,
    },
    {
      key: 'forecastHarmonie',
      predictionType: 'P.harmonie.forecast',
      simulationDate: selectedHarmoniePrecipDate.value,
    },
    {
      key: 'forecastEnsP10',
      predictionType: 'P.ens.forecast',
      simulationDate: selectedEpsPrecipDate.value,
      percentile: '10',
    },
    {
      key: 'forecastEnsP25',
      predictionType: 'P.ens.forecast',
      simulationDate: selectedEpsPrecipDate.value,
      percentile: '25',
    },
    {
      key: 'forecastEnsP75',
      predictionType: 'P.ens.forecast',
      simulationDate: selectedEpsPrecipDate.value,
      percentile: '75',
    },
    {
      key: 'forecastEnsP90',
      predictionType: 'P.ens.forecast',
      simulationDate: selectedEpsPrecipDate.value,
      percentile: '90',
    },
  ])

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

  const caudalChartData = computed(() => ({
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

  const precipitationsChartData = computed(() => ({
    historical: precipitationsHistorical.value,
    forecastHarmonie: precipitationsForecastHarmonie.value,
    forecastEpsat: precipitationsForecastEpstat.value,
    forecastEnsP10: precipitationsForecastEnsP10.value,
    forecastEnsP25: precipitationsForecastEnsP25.value,
    forecastEnsP90: precipitationsForecastEnsP90.value,
    forecastEnsP75: precipitationsForecastEnsP75.value,
  }))

  function clearForecasts(target: ForecastRefsMap) {
    Object.values(target).forEach((predictionRef) => {
      predictionRef.value = undefined
    })
  }

  function getThresholdValue(
    threshold: StationByCodeResponse['threshold'],
    keys: Array<
      | 'umbralNivel1'
      | 'umbralNivel2'
      | 'umbralNivel3'
      | 'umbralCaudal1'
      | 'umbralCaudal2'
      | 'umbralCaudal3'
    >
  ): number | null {
    if (!threshold) return null

    for (const key of keys) {
      const raw = threshold[key]
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    }

    return null
  }

  function stationToFeature(station: StationByCodeResponse): GeoJSON.Feature {
    const hasValidCoordinates =
      station.latitude != null &&
      station.longitude != null &&
      Number.isFinite(station.latitude) &&
      Number.isFinite(station.longitude)

    const longitude = hasValidCoordinates ? (station.longitude as number) : 0
    const latitude = hasValidCoordinates ? (station.latitude as number) : 0

    return {
      type: 'Feature',
      id: station.id,
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      properties: {
        ...station,
        codigo: station.stationCode,
        nombre: station.name,
        tipo: 'SAIH',
        tipo_cod: station.tipoCod ?? null,
        threshold: station.threshold ?? null,
        umbral_caudal_1: getThresholdValue(station.threshold, ['umbralCaudal1', 'umbralNivel1']),
        umbral_caudal_2: getThresholdValue(station.threshold, ['umbralCaudal2', 'umbralNivel2']),
        umbral_caudal_3: getThresholdValue(station.threshold, ['umbralCaudal3', 'umbralNivel3']),
        umbral_cauda_1: getThresholdValue(station.threshold, ['umbralCaudal1', 'umbralNivel1']),
        umbral_cauda_2: getThresholdValue(station.threshold, ['umbralCaudal2', 'umbralNivel2']),
        umbral_cauda_3: getThresholdValue(station.threshold, ['umbralCaudal3', 'umbralNivel3']),
        umbral_amarillo: getThresholdValue(station.threshold, ['umbralCaudal1', 'umbralNivel1']),
        umbral_naranja: getThresholdValue(station.threshold, ['umbralCaudal2', 'umbralNivel2']),
        umbral_rojo: getThresholdValue(station.threshold, ['umbralCaudal3', 'umbralNivel3']),
      },
    }
  }

  function applyForecastData(target: ForecastRefsMap, payload: Partial<DataStationPrediction>) {
    for (const key in target) {
      target[key as ForecastKey].value = payload[key as ForecastKey]
    }
  }

  async function fetchPredictionBatch(
    stationId: string,
    requests: ForecastRequestDef[]
  ): Promise<Partial<DataStationPrediction>> {
    const entries = await Promise.all(
      requests.map(async (requestDef) => {
        if (!requestDef.simulationDate) {
          return [requestDef.key, undefined] as const
        }

        const prediction = await getPredictionsService(
          stationId,
          requestDef.predictionType,
          requestDef.simulationDate,
          requestDef.percentile
        )

        return [requestDef.key, prediction] as const
      })
    )

    const result: Partial<DataStationPrediction> = {}

    for (const [key, prediction] of entries) {
      result[key] = prediction
    }

    return result
  }

  async function getAvailableDates(code: string): Promise<DatesAvailableResponse> {
    try {
      const selectedCodeType = codeType.value === 'E' ? 'E' : 'default'
      const observedCaudalType: PredictionTypeName =
        selectedCodeType === 'E' ? 'FICT99.historical' : 'FICT98.historical'
      const harmonieCaudalType: PredictionTypeName =
        selectedCodeType === 'E' ? 'I.NAM.harmonie' : 'Q.NAM.harmonie'
      const epsCaudalTypes: PredictionTypeName[] =
        selectedCodeType === 'E' ? ['I.NAM.ens.medio', 'I.NAM.ens'] : ['Q.NAM.ens']

      const [
        observedCaudalResponse,
        observedPrecipResponse,
        harmonieCaudalResponse,
        harmoniePrecipResponse,
        ...epsResponses
      ] = await Promise.all([
        getAvailablePredictionsService(code, observedCaudalType),
        getAvailablePredictionsService(code, 'WI__01.historical'),
        getAvailablePredictionsService(code, harmonieCaudalType),
        getAvailablePredictionsService(code, 'P.harmonie.forecast'),
        ...epsCaudalTypes.map((typeName) => getAvailablePredictionsService(code, typeName)),
      ])

      const epsPrecipResponse = await getAvailablePredictionsService(code, 'P.ens.forecast')

      const toDateList = (response: DatesAvailableResponse): string[] => {
        const fromSimulationDates = (response.simulationDates ?? [])
          .map((item) => item.simulationDate)
          .filter((value): value is string => Boolean(value))
        const fromDates = (response.dates ?? []).filter((value): value is string => Boolean(value))

        return Array.from(new Set([...fromSimulationDates, ...fromDates])).sort((a, b) =>
          b.localeCompare(a)
        )
      }

      observedCaudalDates.value = toDateList(observedCaudalResponse)
      observedPrecipDates.value = toDateList(observedPrecipResponse)
      harmonieCaudalDates.value = toDateList(harmonieCaudalResponse)
      harmoniePrecipDates.value = toDateList(harmoniePrecipResponse)
      epsCaudalDates.value = Array.from(new Set(epsResponses.flatMap(toDateList))).sort((a, b) =>
        b.localeCompare(a)
      )
      epsPrecipDates.value = toDateList(epsPrecipResponse)

      const allDates = Array.from(
        new Set([
          ...observedCaudalDates.value,
          ...observedPrecipDates.value,
          ...harmonieCaudalDates.value,
          ...harmoniePrecipDates.value,
          ...epsCaudalDates.value,
          ...epsPrecipDates.value,
        ])
      ).sort((a, b) => b.localeCompare(a))

      const normalized: DatesAvailableResponse = {
        simulationDates: allDates.map((simulationDate): AvailableDateItem => ({ simulationDate })),
        totalResults: allDates.length,
      }

      availableDates.value = normalized
      return normalized
    } catch (err) {
      console.error('Error loading Available Dates', err)
      const fallback: DatesAvailableResponse = { simulationDates: [], totalResults: 0 }
      observedCaudalDates.value = []
      observedPrecipDates.value = []
      harmonieCaudalDates.value = []
      harmoniePrecipDates.value = []
      epsCaudalDates.value = []
      epsPrecipDates.value = []
      availableDates.value = fallback
      return fallback
    }
  }

  function pickDefaultDate(currentValue: string, options: string[]): string {
    if (currentValue && options.includes(currentValue)) return currentValue
    return options[0] ?? ''
  }

  async function refreshPredictions() {
    const currentStation = stationCode.value
    const hasAnySelectedDate =
      selectedObservedCaudalDate.value ||
      selectedObservedPrecipDate.value ||
      selectedHarmonieCaudalDate.value ||
      selectedHarmoniePrecipDate.value ||
      selectedEpsCaudalDate.value ||
      selectedEpsPrecipDate.value

    if (!currentStation || !hasAnySelectedDate) {
      clearForecasts(precipitationRefs)
      clearForecasts(caudalRefs)
      caudalOutflowHistorical.value = undefined
      embalseVolumeHistorical.value = undefined
      loadingPrecipitaciones.value = false
      loadingCaudales.value = false
      return
    }

    const requestId = ++predictionsRequestId
    loadingPrecipitaciones.value = true
    loadingCaudales.value = hasCaudal.value

    try {
      const precipitationPromise = fetchPredictionBatch(currentStation, precipitationRequests.value)

      const caudalPromise = hasCaudal.value
        ? fetchPredictionBatch(
            currentStation,
            codeType.value === 'E'
              ? caudalRequestsByType.value.E
              : caudalRequestsByType.value.default
          )
        : Promise.resolve({} as Partial<DataStationPrediction>)

      const outflowPromise =
        hasCaudal.value && isEmbalse.value && Boolean(selectedObservedCaudalDate.value)
          ? getPredictionsService(
              currentStation,
              'FICT95.historical',
              selectedObservedCaudalDate.value
            )
          : Promise.resolve(undefined)

      const volumePromise =
        hasCaudal.value && isEmbalse.value && Boolean(selectedObservedCaudalDate.value)
          ? getPredictionsService(
              currentStation,
              'VICT01.historical',
              selectedObservedCaudalDate.value
            )
          : Promise.resolve(undefined)

      const [precipitationData, caudalData, outflowData, volumeData] = await Promise.all([
        precipitationPromise,
        caudalPromise,
        outflowPromise,
        volumePromise,
      ])

      if (requestId !== predictionsRequestId) {
        return
      }

      applyForecastData(precipitationRefs, precipitationData)
      applyForecastData(caudalRefs, caudalData)
      caudalOutflowHistorical.value = outflowData
      embalseVolumeHistorical.value = volumeData
    } catch (err) {
      console.error('Error loading predictions:', err)
      if (requestId !== predictionsRequestId) {
        return
      }
      clearForecasts(precipitationRefs)
      clearForecasts(caudalRefs)
      caudalOutflowHistorical.value = undefined
      embalseVolumeHistorical.value = undefined
    } finally {
      if (requestId === predictionsRequestId) {
        loadingPrecipitaciones.value = false
        loadingCaudales.value = false
      }
    }
  }

  // cargar feature
  async function loadFeature(code: string): Promise<boolean> {
    if (!code) {
      error.value = 'Station code is required'
      return false
    }

    const requestId = ++featureRequestId
    loadingFeature.value = true
    error.value = null

    try {
      const station = await api
        .get(`stations/by-code/${encodeURIComponent(code)}`)
        .json<StationByCodeResponse>()
      const result = stationToFeature(station)

      if (requestId !== featureRequestId) {
        return false
      }

      if (!result) {
        error.value = 'Feature not found'
        feature.value = null
        return false
      }

      feature.value = result

      const datesAvailable = await getAvailableDates(code)
      if (requestId !== featureRequestId) {
        return false
      }
      availableDates.value = datesAvailable

      selectedObservedCaudalDate.value = pickDefaultDate(
        selectedObservedCaudalDate.value,
        observedCaudalDates.value
      )
      selectedObservedPrecipDate.value = pickDefaultDate(
        selectedObservedPrecipDate.value,
        observedPrecipDates.value
      )
      selectedHarmonieCaudalDate.value = pickDefaultDate(
        selectedHarmonieCaudalDate.value,
        harmonieCaudalDates.value
      )
      selectedHarmoniePrecipDate.value = pickDefaultDate(
        selectedHarmoniePrecipDate.value,
        harmoniePrecipDates.value
      )
      selectedEpsCaudalDate.value = pickDefaultDate(
        selectedEpsCaudalDate.value,
        epsCaudalDates.value
      )
      selectedEpsPrecipDate.value = pickDefaultDate(
        selectedEpsPrecipDate.value,
        epsPrecipDates.value
      )

      skipNextSimulationWatch = true

      tab.value = hasCaudal.value ? 'caudal' : 'precipitaciones'
      return true
    } catch (err) {
      console.error('Error loading feature:', err)
      error.value = 'Error loading feature'
      feature.value = null
      return false
    } finally {
      if (requestId === featureRequestId) {
        loadingFeature.value = false
      }
    }
  }

  watch(
    [
      selectedObservedCaudalDate,
      selectedObservedPrecipDate,
      selectedHarmonieCaudalDate,
      selectedHarmoniePrecipDate,
      selectedEpsCaudalDate,
      selectedEpsPrecipDate,
    ],
    async (currentValues, previousValues) => {
      if (skipNextSimulationWatch) {
        skipNextSimulationWatch = false
        return
      }

      const harmonieChanged =
        currentValues[2] !== previousValues?.[2] || currentValues[3] !== previousValues?.[3]
      const epsChanged =
        currentValues[4] !== previousValues?.[4] || currentValues[5] !== previousValues?.[5]
      const changedPredictionSelect = harmonieChanged || epsChanged

      loadingMatrixOnPredictionSelect.value = changedPredictionSelect
      loadingHarmoniePredict.value = harmonieChanged
      loadingEpsPredict.value = epsChanged

      try {
        await refreshPredictions()
      } finally {
        loadingMatrixOnPredictionSelect.value = false
        loadingHarmoniePredict.value = false
        loadingEpsPredict.value = false
      }
    }
  )

  watch(
    stationCode,
    async (code) => {
      if (!code) {
        selectedThreshold.value = null
        chartThresholdActionLoading.value = false
        feature.value = null
        error.value = null
        loadingInitialData.value = false
        loadingMatrixOnPredictionSelect.value = false
        loadingHarmoniePredict.value = false
        loadingEpsPredict.value = false
        selectedObservedCaudalDate.value = ''
        selectedObservedPrecipDate.value = ''
        selectedHarmonieCaudalDate.value = ''
        selectedHarmoniePrecipDate.value = ''
        selectedEpsCaudalDate.value = ''
        selectedEpsPrecipDate.value = ''
        caudalOutflowHistorical.value = undefined
        embalseVolumeHistorical.value = undefined
        observedCaudalDates.value = []
        observedPrecipDates.value = []
        harmonieCaudalDates.value = []
        harmoniePrecipDates.value = []
        epsCaudalDates.value = []
        epsPrecipDates.value = []
        availableDates.value = { simulationDates: [], totalResults: 0 }
        clearForecasts(precipitationRefs)
        clearForecasts(caudalRefs)
        loadingPrecipitaciones.value = false
        loadingCaudales.value = false
        return
      }

      selectedThreshold.value = null
      chartThresholdActionLoading.value = false
      clearForecasts(precipitationRefs)
      clearForecasts(caudalRefs)
      loadingInitialData.value = true

      try {
        const loaded = await loadFeature(code)
        if (!loaded) {
          return
        }

        await refreshPredictions()
      } finally {
        loadingInitialData.value = false
      }
    },
    { immediate: true }
  )

  watch(tab, (currentTab) => {
    if (currentTab !== 'caudal') {
      selectedThreshold.value = null
    }
  })

  function closeDrawer() {
    if (!route.query.station) return

    const query = { ...route.query }
    delete query.station

    router.replace({ query })
  }
</script>

<style scoped>
  .saih-sticky-header {
    position: sticky;
    top: 0;
    z-index: 30;
    border-radius: 4px 4px 0 0;
  }

  .chart-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chart-placeholder--caudal {
    min-height: 510px;
  }

  .chart-placeholder--precip {
    min-height: 510px;
  }

  .chart-placeholder--percentiles {
    min-height: 160px;
  }

  @media (max-width: 960px) {
    .chart-placeholder--caudal {
      min-height: 260px;
    }

    .chart-placeholder--precip {
      min-height: 260px;
    }
  }
</style>
