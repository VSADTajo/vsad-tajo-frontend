<template>
  <v-row>
    <v-col cols="12" md="3" lg="2" class="order-2 order-md-1 d-flex flex-column">
      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihAlertStatus
          :loading="loadingPrecipitaciones"
          :precipitations-historical="precipitationsHistorical"
          :thresholds="thresholds"
        />
      </v-card>
      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <v-row>
          <v-col cols="6" md="12">
            <!-- <ContentObservedData
              :loading="loadingCaudales"
              :is-embalse="isEmbalse"
              :caudal-historical="caudalHistorical"
              :caudal-outflow-historical="caudalOutflowHistorical"
              :embalse-volume-historical="embalseVolumeHistorical"
              :thresholds="thresholds"
            /> -->
          </v-col>
        </v-row>
      </v-card>
      <v-card class="ma-2 mt-0 pa-2 bg-background w-100 flex-grow-1" elevation="2">
        <!-- <ContentSaihOperationalSummary
          :loading="loadingCaudales"
          :caudal-historical="caudalHistorical"
          :thresholds="thresholds"
          title="Resumen Operativo Observado"
        /> -->
      </v-card>
    </v-col>
    <v-col cols="12" md="6" lg="8" class="pt-2 pt-md-4 order-1 order-md-2 d-flex flex-column">
      <div class="w-100 d-flex flex-column">
        <v-card class="bg-background w-100 d-flex flex-column">
          <v-card-text>
            <v-sheet class="pa-5">
              <!-- <ForecastChartNew
                :data="caudalChartData"
                :is-embalse="isEmbalse"
                :loading="loadingCaudales"
                :thresholds="thresholds"
              /> -->
            </v-sheet>
          </v-card-text>
        </v-card>
      </div>
    </v-col>

    <v-col cols="12" md="3" lg="2" class="order-3 order-md-3 d-flex flex-column pe-3">
      <v-card class="ml-1 mr-1 mt-2 mb-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <!-- <ContentSaihAlertStatus
          :loading="loadingCaudales"
          :caudal-forecast-harmonie="caudalForecastHarmonie"
          :caudal-forecast-epsat="caudalForecastEpstat"
          :mode="'predictions'"
          :thresholds="thresholds"
        /> -->
      </v-card>
      <v-card class="ml-1 mr-1 my-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <!-- <ContentSaihPredictionsLatest
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
        /> -->
      </v-card>

      <v-card class="ml-1 mr-1 mt-2 pa-2 bg-background w-100 flex-grow-1" elevation="2">
        <!-- <ContentSaihOperationalSummary
          :loading="loadingCaudales"
          :caudal-historical="caudalHistorical"
          :thresholds="thresholds"
          title="Resumen Operativo Predicciones"
        /> -->
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import ContentSaihAlertStatus from './ContentSaih/ContentSaihAlertStatus.vue'

  const props = defineProps<{
    thresholds?: Record<string, unknown>
    normalizedStationCode: string
  }>()

  const loadingPrecipitaciones = ref(false)

  const precipitationsHistorical = ref()

  // const precipitationsChartData = computed(() => ({
  //   historical: precipitationsHistorical.value,
  //   forecastHarmonie: precipitationsForecastHarmonie.value,
  //   forecastEpsat: precipitationsForecastEpstat.value,
  //   forecastEnsP10: precipitationsForecastEnsP10.value,
  //   forecastEnsP25: precipitationsForecastEnsP25.value,
  //   forecastEnsP90: precipitationsForecastEnsP90.value,
  //   forecastEnsP75: precipitationsForecastEnsP75.value,
  // }))
</script>
