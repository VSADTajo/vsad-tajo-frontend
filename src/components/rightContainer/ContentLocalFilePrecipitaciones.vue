<template>
  <v-row class="align-stretch">
    <v-col cols="12" md="3" lg="2" class="order-2 order-md-1 d-flex flex-column">
      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihAlertStatusPrecipObserved
          :precipitations-historical="historical"
          :thresholds="thresholds"
        />
      </v-card>

      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <v-row>
          <v-col cols="6" md="12">
            <ContentObservedData
              active-tab="precipitaciones"
              :precipitations-historical="historical"
              :thresholds="thresholds"
            />
          </v-col>
        </v-row>
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="8" class="pt-2 pt-md-4 order-1 order-md-2 d-flex flex-column">
      <div class="w-100 d-flex flex-column">
        <v-card class="bg-background w-100 d-flex flex-column flex-grow-1" elevation="2">
          <v-card-text class="pa-2 d-flex flex-column flex-grow-1">
            <v-tabs v-model="selectedPrecipChartTab" class="bg-surface px-2">
              <v-tab value="precipitaciones">Precipitaciones</v-tab>
              <v-tab value="acumuladas">Acumuladas</v-tab>
            </v-tabs>

            <v-window v-model="selectedPrecipChartTab" class="flex-grow-1">
              <v-window-item value="precipitaciones" class="h-100">
                <v-sheet class="pa-2 h-100 d-flex flex-column">
                  <PrecipitationsChart :data="chartData" :height="570" mode="precipitations" />
                </v-sheet>
              </v-window-item>

              <v-window-item value="acumuladas" class="h-100">
                <v-sheet class="pa-2 h-100 d-flex flex-column">
                  <PrecipAccumulatedTimeSeriesChart
                    :precipitations-historical="historical"
                    :precipitations-forecast-harmonie="forecastHarmonie"
                    :precipitations-forecast-epstat="forecastEpsat"
                    :height="570"
                  />
                </v-sheet>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </div>
    </v-col>

    <v-col cols="12" md="3" lg="2" class="order-3 order-md-3 d-flex flex-column pe-3 pl-0">
      <v-card class="ml-1 mr-1 mt-2 mb-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihAlertStatusPrecipPredictions
          :precipitations-forecast-harmonie="forecastHarmonie"
          :precipitations-forecast-epstat="forecastEpsat"
          :precipitations-forecast-ens-p10="forecastEnsP10"
          :precipitations-forecast-ens-p25="forecastEnsP25"
          :precipitations-forecast-ens-p75="forecastEnsP75"
          :precipitations-forecast-ens-p90="forecastEnsP90"
          :thresholds="thresholds"
        />
      </v-card>

      <v-card class="ml-1 mr-1 my-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihPredictionsLatest
          class="ma-2"
          active-tab="precipitaciones"
          hide-date-selector
          :precipitations-forecast-harmonie="forecastHarmonie"
          :precipitations-forecast-epstat="forecastEpsat"
          :thresholds="thresholds"
        />
      </v-card>
    </v-col>
  </v-row>

  <v-row class="align-stretch">
    <v-col cols="12" md="3" lg="4" class="order-4 order-md-4 d-flex flex-column">
      <v-card
        class="ma-2 mt-2 pa-2 bg-background w-100 flex-grow-1 d-flex flex-column"
        elevation="2"
      >
        <ContentSaihPrecipStationTable
          :precipitations-historical="historical"
          :precipitations-forecast-harmonie="forecastHarmonie"
          :precipitations-forecast-epstat="forecastEpsat"
          :precipitations-forecast-ens-p10="forecastEnsP10"
          :precipitations-forecast-ens-p25="forecastEnsP25"
          :precipitations-forecast-ens-p75="forecastEnsP75"
          :precipitations-forecast-ens-p90="forecastEnsP90"
          :thresholds="thresholds"
        />
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="8" class="order-5 order-md-5 d-flex flex-column">
      <v-card
        class="pa-2 bg-background w-100 mt-2 md:mt-0 flex-grow-1 d-flex flex-column"
        elevation="2"
      >
        <ContentSaihPrecipAccumulatedBars
          :precipitations-historical="historical"
          :precipitations-forecast-harmonie="forecastHarmonie"
          :precipitations-forecast-epstat="forecastEpsat"
          :precipitations-forecast-ens-p10="forecastEnsP10"
          :precipitations-forecast-ens-p25="forecastEnsP25"
          :precipitations-forecast-ens-p75="forecastEnsP75"
          :precipitations-forecast-ens-p90="forecastEnsP90"
        />
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import type { DataStationPrediction } from '@/types/Predictions'

  import PrecipitationsChart from '../charts/PrecipitationsChart.vue'
  import PrecipAccumulatedTimeSeriesChart from '../charts/PrecipAccumulatedTimeSeriesChart.vue'
  import ContentObservedData from './ContentSaih/ContentObservedData.vue'
  import ContentSaihPredictionsLatest from './ContentSaih/ContentSaihPredictionsLatest.vue'
  import ContentSaihPrecipStationTable from './ContentSaih/ContentSaihPrecipStationTable.vue'
  import ContentSaihPrecipAccumulatedBars from './ContentSaih/ContentSaihPrecipAccumulatedBars.vue'
  import ContentSaihAlertStatusPrecipPredictions from './ContentSaih/ContentSaihAlertStatusPrecipPredictions.vue'
  import ContentSaihAlertStatusPrecipObserved from './ContentSaih/ContentSaihAlertStatusPrecipObserved.vue'

  const props = defineProps<{
    thresholds?: Record<string, unknown>
    predictions?: DataStationPrediction
  }>()

  const historical = computed(() => props.predictions?.historical)
  const forecastHarmonie = computed(() => props.predictions?.forecastHarmonie)
  const forecastEpsat = computed(() => props.predictions?.forecastEpsat)
  const forecastEnsP10 = computed(() => props.predictions?.forecastEnsP10)
  const forecastEnsP25 = computed(() => props.predictions?.forecastEnsP25)
  const forecastEnsP75 = computed(() => props.predictions?.forecastEnsP75)
  const forecastEnsP90 = computed(() => props.predictions?.forecastEnsP90)

  const chartData = computed(() => ({
    historical: historical.value,
    forecastHarmonie: forecastHarmonie.value,
    forecastEpsat: forecastEpsat.value,
    forecastEnsP10: forecastEnsP10.value,
    forecastEnsP25: forecastEnsP25.value,
    forecastEnsP90: forecastEnsP90.value,
    forecastEnsP75: forecastEnsP75.value,
  }))

  const selectedPrecipChartTab = ref<'precipitaciones' | 'acumuladas'>('precipitaciones')
</script>
