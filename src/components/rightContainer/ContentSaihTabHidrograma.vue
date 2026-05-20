<template>
  <v-row>
    <v-col cols="12" md="3" lg="2" class="order-2 order-md-1 d-flex flex-column">
      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihAlertStatus
          :loading="loading"
          :caudal-historical="caudalHistorical"
          :thresholds="thresholds"
          style="min-height: 125px"
        />
      </v-card>

      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <v-row>
          <v-col cols="6" md="12">
            <ContentObservedData
              :loading="loading"
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
          :loading="loading || loadingCaudales"
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
                :data="caudalChartData as any"
                :is-embalse="isEmbalse"
                :loading="loadingCaudales || chartThresholdActionLoading"
                :thresholds="thresholds"
                :focus-threshold-request="focusThresholdRequest as any"
                @focus-threshold-complete="emit('update:chart-threshold-action-loading', false)"
              />
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
            :loading="matrixLoading"
          />
        </v-card>
      </div>
    </v-col>

    <v-col cols="12" md="3" lg="2" class="order-3 order-md-3 d-flex flex-column pe-3">
      <v-card class="ml-1 mr-1 mt-2 mb-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihAlertStatus
          :loading="loadingCaudales"
          :caudal-forecast-harmonie="caudalForecastHarmonie"
          :caudal-forecast-epsat="caudalForecastEpstat"
          :mode="'predictions'"
          :thresholds="thresholds"
        />
      </v-card>
      <v-card class="ml-1 mr-1 my-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihPredictionsLatest
          class="ma-2"
          :active-tab="activeTab ?? 'caudal'"
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
          :thresholds="thresholds"
          @update:selected-harmonie-caudal-date="
            emit('update:selected-harmonie-caudal-date', $event)
          "
          @update:selected-harmonie-precip-date="
            emit('update:selected-harmonie-precip-date', $event)
          "
          @update:selected-eps-caudal-date="emit('update:selected-eps-caudal-date', $event)"
          @update:selected-eps-precip-date="emit('update:selected-eps-precip-date', $event)"
        />
      </v-card>

      <v-card class="ml-1 mr-1 mt-2 pa-2 bg-background w-100 flex-grow-1" elevation="2">
        <ContentSaihOperationalSummary
          :loading="loading || loadingCaudales"
          :caudal-historical="caudalHistorical"
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
          :resguardo-prediction="resguardoPrediction"
          :volumen-minimo-prediction="volumenMinimoPrediction"
          @update:resguardo-prediction="emit('update:resguardo-prediction', $event)"
          @update:volumen-minimo-prediction="emit('update:volumen-minimo-prediction', $event)"
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
          :resguardo-prediction="resguardoPrediction"
          :volumen-minimo-prediction="volumenMinimoPrediction"
        />
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
  import type { StationPrediction } from '@/types/Predictions'
  import ContentSaihAlertStatus from './ContentSaih/ContentSaihAlertStatus.vue'
  import ContentObservedData from './ContentSaih/ContentObservedData.vue'
  import ContentSaihOperationalSummary from './ContentSaih/ContentSaihOperationalSummary.vue'
  import ContentSaihResguardosData from './ContentSaih/ContentSaihResguardosData.vue'
  import ForecastChartNew from '../charts/ForecastChartNew.vue'
  import ContentUmbralesData from './ContentSaih/ContentUmbralesData.vue'
  import ContentSaihCaudalMatrix from './ContentSaih/ContentSaihCaudalMatrix.vue'
  import ContentSaihPredictionsLatest from './ContentSaih/ContentSaihPredictionsLatest.vue'
  import ContentSaihResguardosChart from './ContentSaih/ContentSaihResguardosChart.vue'

  const emit = defineEmits<{
    (event: 'update:resguardo-prediction', value: StationPrediction | undefined): void
    (event: 'update:volumen-minimo-prediction', value: StationPrediction | undefined): void
    (event: 'update:chart-threshold-action-loading', value: boolean): void
    (event: 'update:selected-harmonie-caudal-date', value: string): void
    (event: 'update:selected-harmonie-precip-date', value: string): void
    (event: 'update:selected-eps-caudal-date', value: string): void
    (event: 'update:selected-eps-precip-date', value: string): void
  }>()

  defineProps<{
    loading?: boolean
    loadingCaudales?: boolean
    caudalHistorical?: StationPrediction
    caudalOutflowHistorical?: StationPrediction
    embalseVolumeHistorical?: StationPrediction
    caudalForecastHarmonie?: StationPrediction
    caudalForecastEpstat?: StationPrediction
    caudalChartData?: Record<string, unknown>
    focusThresholdRequest?: Record<string, unknown> | null
    chartThresholdActionLoading?: boolean
    selectedThreshold?: { kind: 'caudal' | 'volumen'; level: 1 | 2 | 3 } | null
    handleThresholdFocus?: (
      payload: { kind: 'caudal' | 'volumen'; level: 1 | 2 | 3 } | null
    ) => void
    matrixLoading?: boolean
    resguardoPrediction?: StationPrediction
    volumenMinimoPrediction?: StationPrediction
    isEmbalse?: boolean
    thresholds?: Record<string, unknown>
    activeTab?: 'caudal' | 'precipitaciones'
    sidePanelsLoading?: boolean
    loadingHarmoniePredict?: boolean
    loadingEpsPredict?: boolean
    precipitationsForecastHarmonie?: StationPrediction
    precipitationsForecastEpstat?: StationPrediction
    selectedHarmonieCaudalDate?: string
    selectedHarmoniePrecipDate?: string
    selectedEpsCaudalDate?: string
    selectedEpsPrecipDate?: string
    harmonieCaudalDates?: string[]
    harmoniePrecipDates?: string[]
    epsCaudalDates?: string[]
    epsPrecipDates?: string[]
  }>()
</script>

<style scoped>
  .sticky-right-col {
    position: sticky;
    right: 0;
    z-index: 10;
    align-self: flex-start;
  }
</style>
