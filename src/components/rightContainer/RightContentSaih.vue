<template>
  <v-card class="pa-2 bg-background" elevation="2">
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
      <v-card-title class="d-flex justify-space-between align-start pa-6" :style="headerStyle">
        <div>
          <div class="text-h6 font-weight-bold" style="color: white">
            {{ feature.properties?.codigo }}
          </div>
          <div class="text-caption" style="color: rgba(255, 255, 255, 0.9)">
            {{ feature.properties?.nombre }}
          </div>
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          style="color: white"
          @click="closeDrawer"
        />
      </v-card-title>

      <v-card-text>
        <!-- Tipo -->
        <div class="mb-2 mt-2">
          <v-chip
            :icon="feature?.properties?.tipo === 'SAIH' ? 'mdi-water' : 'mdi-map-marker'"
            :color="stationBaseColor"
            variant="tonal"
            size="small"
            class="font-weight-bold"
          >
            {{ feature?.properties?.tipo }}
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

  <v-row class="mt-2">
    <v-col cols="12" md="3" lg="2" class="order-2 order-md-1">
      <v-card class="ma-2 pa-2 bg-background h-100" elevation="2">
        <v-row>
          <v-col cols="6" md="12">
            <ContentSaihLastData />
          </v-col>
          <v-col cols="6" md="12">
            <ContentSaihLastWeek />
          </v-col>
        </v-row>
      </v-card>
    </v-col>
    <v-col cols="12" md="6" lg="8" class="pt-2 pt-md-4 order-1 order-md-2">
      <v-card class="bg-background">
        <v-card-text>
          <v-row v-if="feature && !loadingFeature">
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="selectedSimulationDate"
                disabled
                :items="formattedDates"
                label="Fecha de Simulación"
                item-title="title"
                item-value="value"
                variant="outlined"
                density="compact"
                color="primary"
              />
            </v-col>
          </v-row>

          <!-- skeleton for select when loading -->
          <v-row v-else-if="loadingFeature">
            <v-col cols="4">
              <v-skeleton-loader type="text" height="48" />
            </v-col>
          </v-row>

          <v-sheet elevation="2">
            <v-tabs v-model="tab" color="primary">
              <v-tab v-if="hasCaudal" value="caudal">Caudal</v-tab>
              <v-tab value="precipitaciones">Precipitaciones</v-tab>
            </v-tabs>

            <v-divider></v-divider>

            <v-tabs-window v-model="tab">
              <v-tabs-window-item v-if="hasCaudal" value="caudal">
                <v-sheet v-if="caudalForecastHarmonie || caudalForecastEpstat" class="pa-5">
                  <ForecastChartNew :data="caudalChartData" />
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
                    !loadingCaudales && (selectedSimulationDate || availableDates.length === 0)
                  "
                  class="chart-placeholder chart-placeholder--caudal"
                >
                  No hay Datos de Caudales Disponibles
                </div>
              </v-tabs-window-item>

              <v-tabs-window-item value="precipitaciones">
                <v-sheet
                  v-if="precipitationsForecastHarmonie || precipitationsForecastEpstat"
                  class="pa-5"
                >
                  <PrecipitationsChart :data="precipitationsChartData" />
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
                    (selectedSimulationDate || availableDates.length === 0)
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
    </v-col>
    <v-col cols="12" md="3" lg="2" class="order-3 order-md-3">
      <v-card class="ma-2 pa-2 bg-background h-100" elevation="2">
        <v-row>
          <v-col cols="6" md="12">
            <ContentSaihPredictionsLatest />
          </v-col>
          <v-col cols="6" md="12">
            <ContentSaihPredictionsWeek />
          </v-col>
        </v-row>
      </v-card>
    </v-col>
  </v-row>

  <v-row no-gutters class="px-2">
    <v-col cols="12" md="7" class="mb-2 mb-md-0">
      <ContentSaihCaudalMatrix
        :forecast-harmonie="caudalForecastHarmonie"
        :forecast-epsat="caudalForecastEpstat"
        :thresholds="feature?.properties as Record<string, unknown>"
        :loading="loadingCaudales"
      />
    </v-col>

    <v-col cols="12" md="5" class="px-2">
      <v-card class="bg-surface" elevation="2">
        <v-card-title class="text-subtitle-1 font-weight-bold">Percentiles de caudal</v-card-title>
        <v-divider />

        <v-card-text>
          <div
            v-if="
              caudalForecastEnsP10 ||
              caudalForecastEnsP25 ||
              caudalForecastEnsP75 ||
              caudalForecastEnsP90
            "
          >
            <ForecastChartNew :data="caudalPercentilesChartData" :toolbar="false" :height="220" />
          </div>

          <div v-else-if="loadingCaudales" class="chart-placeholder chart-placeholder--percentiles">
            <v-skeleton-loader style="width: 100%; height: 100%" type="image" />
          </div>

          <div v-else class="chart-placeholder chart-placeholder--percentiles">
            No hay datos de percentiles disponibles
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
  import { ref, computed, watch, type Ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { getWFSFeatureById } from '@/services/geoserver'
  import { dynamicLayersConfig } from '@/config/layers.config'
  import type { WFSLayerConfig } from '@/types/Layers'
  import { formatSimulationDate } from '@/utils/dates'
  import type {
    DataStationPrediction,
    PredictionTypeName,
    StationPrediction,
  } from '@/types/Predictions'
  import PrecipitationsChart from '../charts/PrecipitationsChart.vue'
  import { getAvailablePredictionsService, getPredictionsService } from '@/services/predictions'
  import ForecastChartNew from '../charts/ForecastChartNew.vue'
  import { getSaihTypeColor } from '@/utils/saihStations'
  import ContentSaihInfo from './ContentSaih/ContentSaihInfo.vue'
  import ContentSaihLastData from './ContentSaih/ContentSaihLastData.vue'
  import ContentSaihLastWeek from './ContentSaih/ContentSaihLastWeek.vue'
  import ContentSaihCaudalMatrix from './ContentSaih/ContentSaihCaudalMatrix.vue'
  import ContentSaihPredictionsLatest from './ContentSaih/ContentSaihPredictionsLatest.vue'
  import ContentSaihPredictionsWeek from './ContentSaih/ContentSaihPredictionsWeek.vue'

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

  const caudalForecastEpstat = ref<StationPrediction>()
  const caudalForecastHarmonie = ref<StationPrediction>()

  const caudalForecastEnsP10 = ref<StationPrediction>()
  const caudalForecastEnsP25 = ref<StationPrediction>()
  const caudalForecastEnsP75 = ref<StationPrediction>()
  const caudalForecastEnsP90 = ref<StationPrediction>()

  const availableDates = ref<string[]>([])
  const selectedSimulationDate = ref<string>('')

  // station desde la URL
  const stationCode = computed(() => route.query.station as string | undefined)

  // config de la capa SAIH
  const saihConfig = computed<WFSLayerConfig | undefined>(
    () => dynamicLayersConfig.find((l) => l.id === 'saih') as WFSLayerConfig | undefined
  )

  const codeType = computed(() => feature.value?.properties?.tipo_cod)

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
      margin: '-16px -16px 0 -16px',
    }
  })

  const hasCaudal = computed(
    () => codeType.value === 'AR' || codeType.value === 'AC' || codeType.value === 'E'
  )

  const tab = ref(hasCaudal.value ? 'caudal' : 'precipitaciones')
  let availableDatesCache: string[] | null = null
  let featureRequestId = 0
  let predictionsRequestId = 0
  let skipNextSimulationWatch = false

  type ForecastKey = keyof DataStationPrediction
  type ForecastRefsMap = Record<ForecastKey, Ref<StationPrediction | undefined>>
  type ForecastRequestDef = {
    key: ForecastKey
    predictionType: PredictionTypeName
    useSimulationDate?: boolean
    percentile?: string
  }

  const precipitationRefs: ForecastRefsMap = {
    forecastHarmonie: precipitationsForecastHarmonie,
    forecastEpsat: precipitationsForecastEpstat,
    forecastEnsP10: precipitationsForecastEnsP10,
    forecastEnsP25: precipitationsForecastEnsP25,
    forecastEnsP75: precipitationsForecastEnsP75,
    forecastEnsP90: precipitationsForecastEnsP90,
  }

  const caudalRefs: ForecastRefsMap = {
    forecastHarmonie: caudalForecastHarmonie,
    forecastEpsat: caudalForecastEpstat,
    forecastEnsP10: caudalForecastEnsP10,
    forecastEnsP25: caudalForecastEnsP25,
    forecastEnsP75: caudalForecastEnsP75,
    forecastEnsP90: caudalForecastEnsP90,
  }

  const precipitationRequests: ForecastRequestDef[] = [
    { key: 'forecastEpsat', predictionType: 'P.ens.forecast', useSimulationDate: true },
    { key: 'forecastHarmonie', predictionType: 'P.harmonie.forecast' },
    {
      key: 'forecastEnsP10',
      predictionType: 'P.ens.forecast',
      useSimulationDate: true,
      percentile: '10',
    },
    {
      key: 'forecastEnsP25',
      predictionType: 'P.ens.forecast',
      useSimulationDate: true,
      percentile: '25',
    },
    {
      key: 'forecastEnsP75',
      predictionType: 'P.ens.forecast',
      useSimulationDate: true,
      percentile: '75',
    },
    {
      key: 'forecastEnsP90',
      predictionType: 'P.ens.forecast',
      useSimulationDate: true,
      percentile: '90',
    },
  ]

  const caudalRequestsByType: Record<'default' | 'E', ForecastRequestDef[]> = {
    default: [
      { key: 'forecastHarmonie', predictionType: 'Q.NAM.harmonie' },
      { key: 'forecastEpsat', predictionType: 'Q.NAM.ens' },
      { key: 'forecastEnsP10', predictionType: 'Q.NAM.ens', percentile: '10' },
      { key: 'forecastEnsP25', predictionType: 'Q.NAM.ens', percentile: '25' },
      { key: 'forecastEnsP75', predictionType: 'Q.NAM.ens', percentile: '75' },
      { key: 'forecastEnsP90', predictionType: 'Q.NAM.ens', percentile: '90' },
    ],
    E: [
      { key: 'forecastHarmonie', predictionType: 'I.NAM.harmonie' },
      { key: 'forecastEpsat', predictionType: 'I.NAM.ens.medio' },
      { key: 'forecastEnsP10', predictionType: 'I.NAM.ens', percentile: '10' },
      { key: 'forecastEnsP25', predictionType: 'I.NAM.ens', percentile: '25' },
      { key: 'forecastEnsP75', predictionType: 'I.NAM.ens', percentile: '75' },
      { key: 'forecastEnsP90', predictionType: 'I.NAM.ens', percentile: '90' },
    ],
  }

  // Formatear fechas para el select
  const formattedDates = computed(() =>
    availableDates.value.map((date) => ({
      title: formatSimulationDate(date),
      value: date,
    }))
  )

  const caudalChartData = computed(() => ({
    forecastHarmonie: caudalForecastHarmonie.value,
    forecastEpsat: caudalForecastEpstat.value,
    forecastEnsP10: caudalForecastEnsP10.value,
    forecastEnsP25: caudalForecastEnsP25.value,
    forecastEnsP90: caudalForecastEnsP90.value,
    forecastEnsP75: caudalForecastEnsP75.value,
  }))

  const precipitationsChartData = computed(() => ({
    forecastHarmonie: precipitationsForecastHarmonie.value,
    forecastEpsat: precipitationsForecastEpstat.value,
    forecastEnsP10: precipitationsForecastEnsP10.value,
    forecastEnsP25: precipitationsForecastEnsP25.value,
    forecastEnsP90: precipitationsForecastEnsP90.value,
    forecastEnsP75: precipitationsForecastEnsP75.value,
  }))

  const caudalPercentilesChartData = computed(() => ({
    forecastEnsP10: caudalForecastEnsP10.value,
    forecastEnsP25: caudalForecastEnsP25.value,
    forecastEnsP90: caudalForecastEnsP90.value,
    forecastEnsP75: caudalForecastEnsP75.value,
  }))

  function clearForecasts(target: ForecastRefsMap) {
    Object.values(target).forEach((predictionRef) => {
      predictionRef.value = undefined
    })
  }

  function applyForecastData(target: ForecastRefsMap, payload: Partial<DataStationPrediction>) {
    for (const key in target) {
      target[key as ForecastKey].value = payload[key as ForecastKey]
    }
  }

  async function fetchPredictionBatch(
    stationId: string,
    simulationDate: string,
    requests: ForecastRequestDef[]
  ): Promise<Partial<DataStationPrediction>> {
    const entries = await Promise.all(
      requests.map(async (requestDef) => {
        const prediction = await getPredictionsService(
          stationId,
          requestDef.predictionType,
          requestDef.useSimulationDate ? simulationDate : undefined,
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

  async function getAvailableDatesCached(): Promise<string[]> {
    if (availableDatesCache) {
      return availableDatesCache
    }

    try {
      availableDatesCache = await getAvailablePredictionsService()
      return availableDatesCache
    } catch (err) {
      console.error('Error loading Available Dates', err)
      availableDatesCache = []
      return []
    }
  }

  async function refreshPredictions() {
    const currentStation = stationCode.value
    const simulationDate = selectedSimulationDate.value

    if (!currentStation || !simulationDate) {
      clearForecasts(precipitationRefs)
      clearForecasts(caudalRefs)
      loadingPrecipitaciones.value = false
      loadingCaudales.value = false
      return
    }

    const requestId = ++predictionsRequestId
    loadingPrecipitaciones.value = true
    loadingCaudales.value = hasCaudal.value

    try {
      const precipitationPromise = fetchPredictionBatch(
        currentStation,
        simulationDate,
        precipitationRequests
      )

      const caudalPromise = hasCaudal.value
        ? fetchPredictionBatch(
            currentStation,
            simulationDate,
            codeType.value === 'E' ? caudalRequestsByType.E : caudalRequestsByType.default
          )
        : Promise.resolve({} as Partial<DataStationPrediction>)

      const [precipitationData, caudalData] = await Promise.all([
        precipitationPromise,
        caudalPromise,
      ])

      if (requestId !== predictionsRequestId) {
        return
      }

      applyForecastData(precipitationRefs, precipitationData)
      applyForecastData(caudalRefs, caudalData)
    } catch (err) {
      console.error('Error loading predictions:', err)
      if (requestId !== predictionsRequestId) {
        return
      }
      clearForecasts(precipitationRefs)
      clearForecasts(caudalRefs)
    } finally {
      if (requestId === predictionsRequestId) {
        loadingPrecipitaciones.value = false
        loadingCaudales.value = false
      }
    }
  }

  // cargar feature
  async function loadFeature(code: string): Promise<boolean> {
    if (!saihConfig.value) {
      console.warn('SAIH layer config not found')
      return false
    }

    if (!code) {
      error.value = 'Station code is required'
      return false
    }

    const requestId = ++featureRequestId
    loadingFeature.value = true
    error.value = null

    try {
      const [result, datesAvailable] = await Promise.all([
        getWFSFeatureById(saihConfig.value, 'codigo', code),
        getAvailableDatesCached(),
      ])

      if (requestId !== featureRequestId) {
        return false
      }

      if (!result) {
        error.value = 'Feature not found'
        feature.value = null
        return false
      }

      feature.value = result
      availableDates.value = datesAvailable

      skipNextSimulationWatch = true
      selectedSimulationDate.value = datesAvailable[0] ?? ''

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

  watch(selectedSimulationDate, async (date) => {
    if (!date) {
      return
    }

    if (skipNextSimulationWatch) {
      skipNextSimulationWatch = false
      return
    }

    await refreshPredictions()
  })

  watch(
    stationCode,
    async (code) => {
      if (!code) {
        feature.value = null
        error.value = null
        selectedSimulationDate.value = ''
        availableDates.value = []
        clearForecasts(precipitationRefs)
        clearForecasts(caudalRefs)
        loadingPrecipitaciones.value = false
        loadingCaudales.value = false
        return
      }

      clearForecasts(precipitationRefs)
      clearForecasts(caudalRefs)

      const loaded = await loadFeature(code)
      if (!loaded) {
        return
      }

      await refreshPredictions()
    },
    { immediate: true }
  )

  function closeDrawer() {
    if (!route.query.station) return

    const query = { ...route.query }
    delete query.station

    router.replace({ query })
  }
</script>

<style scoped>
  .chart-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chart-placeholder--caudal {
    min-height: 320px;
  }

  .chart-placeholder--precip {
    min-height: 500px;
  }

  .chart-placeholder--percentiles {
    min-height: 160px;
  }

  @media (max-width: 960px) {
    .chart-placeholder--caudal {
      min-height: 260px;
    }

    .chart-placeholder--precip {
      min-height: 360px;
    }
  }
</style>
