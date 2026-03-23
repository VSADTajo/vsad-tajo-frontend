<template>
  <v-card class="pa-4 bg-background" elevation="2">
    <v-progress-linear v-if="loading" indeterminate />

    <template v-if="feature">
      <v-card-title class="d-flex justify-space-between align-start">
        <div>
          <div class="text-h6 font-weight-bold">
            {{ feature.properties?.nombre }}
          </div>
          <div class="text-caption">Código: {{ feature.properties?.codigo }}</div>
        </div>

        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDrawer" />
      </v-card-title>

      <v-divider class="my-3" />

      <v-card-text>
        <!-- Tipo -->
        <div class="mb-3">
          <v-chip color="primary" variant="tonal" size="small">
            {{ feature?.properties?.tipo }}
          </v-chip>
        </div>

        <!-- Información -->
        <v-row dense>
          <v-col cols="12" sm="3">
            <div class="text-caption">Zona</div>
            <div class="text-body-2 font-weight-medium">
              {{ feature.properties?.zona }}
            </div>
          </v-col>

          <v-col cols="12" sm="3">
            <div class="text-caption">Municipio</div>
            <div class="text-body-2 font-weight-medium">
              {{ feature?.properties?.municipio }}
            </div>
          </v-col>

          <v-col cols="12" sm="3">
            <div class="text-caption">Provincia</div>
            <div class="text-body-2 font-weight-medium">
              {{ feature?.properties?.provincia }}
            </div>
          </v-col>

          <v-col cols="12" sm="3">
            <div class="text-caption">CCAA</div>
            <div class="text-body-2 font-weight-medium">
              {{ feature?.properties?.ccaa }}
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </template>

    <v-alert v-if="error" type="error" variant="tonal">
      {{ error }}
    </v-alert>
  </v-card>

  <v-card class="bg-background">
    <v-card-text>
      <v-sheet elevation="2">
        <v-tabs v-model="tab" color="primary">
          <v-tab value="caudal">Caudal</v-tab>
          <v-tab value="precipitaciones">Precipitaciones</v-tab>
        </v-tabs>

        <v-divider></v-divider>

        <v-tabs-window v-model="tab">
          <v-tabs-window-item value="caudal">
            <v-sheet v-if="forecastNAM_Harmonie && forecastNAM_Epstat" class="pa-5">
              <ForecastChart
                :forecast-det="forecastNAM_Harmonie"
                :forecast-ens="forecastNAM_Epstat"
                unit="m³/s"
                chart-type="line"
                :percentile-keys="{
                  median: 'Q.NAM.ens.Med',
                  p90: 'Q.NAM.ens.90',
                  p75: 'Q.NAM.ens.75',
                  p25: 'Q.NAM.ens.25',
                  p10: 'Q.NAM.ens.10',
                }"
                :labels="{
                  observed: 'Caudal Observado',
                  p1090: 'Predicción P10-P90',
                  p2575: 'Predicción P25-P75',
                  eps: 'Predicción Det. EPS',
                  harmonie: 'Predicción Det. Harmonie',
                }"
                :extra-options="{
                  stroke: { width: [0, 0, 3, 3] },
                  fill: { type: 'solid', opacity: [0.15, 0.35, 1, 1] },
                  colors: ['#90CAF9', '#42A5F5', '#1565C0', '#25733a'],
                }"
              />
            </v-sheet>
          </v-tabs-window-item>
          <v-tabs-window-item value="precipitaciones">
            <v-sheet v-if="precipitationMockup" class="pa-5">
              <ForecastChart
                :forecast-det="forecastPrecip_Harmonie"
                :forecast-ens="forecastPrecip_EPS"
                :observed="telemetryExample"
                unit="mm"
                chart-type="bar"
                :percentile-keys="{
                  median: 'P.ens.forecast.Med',
                  p90: 'P.ens.forecast.90',
                  p75: 'P.ens.forecast.75',
                  p25: 'P.ens.forecast.25',
                  p10: 'P.ens.forecast.10',
                }"
                :labels="{
                  observed: 'Precipitación Observada',
                  p1090: 'Predicción P10-P90',
                  p2575: 'Predicción P25-P75',
                  eps: 'Predicción Det. EPS',
                  harmonie: 'Predicción Det. Harmonie',
                }"
                :extra-options="{
                  dataLabels: { enabled: false },
                  stroke: { width: [2, 0, 0, 2, 2] },
                  fill: { type: 'solid', opacity: [1, 0.15, 0.35, 1, 1] },
                  plotOptions: { bar: { columnWidth: '20%' } },
                  colors: ['#d4a524', '#90CAF9', '#42A5F5', '#1565C0', '#25733a'],
                }"
              />
            </v-sheet>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-sheet>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { ref, computed, watch, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { getWFSFeatureById } from '@/services/geoserver'
  import { dynamicLayersConfig } from '@/config/layers.config'
  import type { WFSLayerConfig } from '@/types/Layers'
  import { precipitationMockup } from '@/MOCKUPS/precip'
  import { forecastNAM_Harmonie } from '@/MOCKUPS/aforo/forecastNAM_Harmonie'
  import { forecastNAM_Epstat } from '@/MOCKUPS/aforo/forecastNAM_Epstat'
  import { forecastPrecip_Harmonie } from '@/MOCKUPS/precipitaciones/forecast_Precipitacion_Harmonie'
  import { forecastPrecip_EPS } from '@/MOCKUPS/precipitaciones/forecast_Precipitation_EPS'
  import ForecastChart from '@/components/charts/ForecastChart.vue'
  import { telemetryExample } from '@/MOCKUPS/precipitaciones/precipitaciones_observadas'

  const route = useRoute()
  const router = useRouter()

  const tab = ref('caudal')

  const feature = ref<GeoJSON.Feature | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // station desde la URL
  const stationCode = computed(() => route.query.station as string | undefined)

  // config de la capa SAIH
  const saihConfig = computed<WFSLayerConfig | undefined>(
    () => dynamicLayersConfig.find((l) => l.id === 'saih') as WFSLayerConfig | undefined
  )

  // cargar feature
  async function loadFeature(code: string) {
    if (!saihConfig.value) {
      console.warn('SAIH layer config not found')
      return
    }

    loading.value = true
    error.value = null

    console.log('saihConfig.value', saihConfig.value)

    try {
      const result = await getWFSFeatureById(saihConfig.value, 'codigo', code)

      if (!result) {
        error.value = 'Feature not found'
        feature.value = null
        return
      }

      feature.value = result
    } catch (err) {
      console.error('Error loading feature', err)
      error.value = 'Error loading feature'
      feature.value = null
    } finally {
      loading.value = false
    }
  }

  // reaccionar al cambio de URL
  watch(
    stationCode,
    (code) => {
      if (!code) {
        feature.value = null
        return
      }

      loadFeature(code)
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
