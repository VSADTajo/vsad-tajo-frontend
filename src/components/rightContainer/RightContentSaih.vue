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

  <v-row>
    <v-col cols="2">
      <v-card class="ma-2 pa-2 bg-background" elevation="2">
        <v-row>
          <v-col cols="12">
            <ContentSaihLastData />
          </v-col>
          <v-col cols="12">
            <ContentSaihLastWeek />
          </v-col>
        </v-row>
      </v-card>
    </v-col>
    <v-col cols="8" class="pt-4">
      <v-card class="bg-background">
        <v-card-text>
          <v-row v-if="feature && !loadingFeature">
            <v-col cols="4">
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
                  <ForecastChartNew
                    :forecast-harmonie="caudalForecastHarmonie"
                    :forecast-epsat="caudalForecastEpstat"
                    :forecast-ens-p10="caudalForecastEnsP10"
                    :forecast-ens-p25="caudalForecastEnsP25"
                    :forecast-ens-p90="caudalForecastEnsP90"
                    :forecast-ens-p75="caudalForecastEnsP75"
                  />
                </v-sheet>
                <!-- show skeleton while loading and keep reserved height to avoid layout jumps -->
                <div
                  v-else-if="loadingCaudales || loadingPrecipitaciones"
                  style="height: 360px; display: flex; align-items: center; justify-content: center"
                >
                  <v-skeleton-loader style="width: 100%; height: 100%" type="image" />
                </div>

                <div
                  v-else-if="
                    !loadingCaudales && (selectedSimulationDate || availableDates.length === 0)
                  "
                  style="height: 360px; display: flex; align-items: center; justify-content: center"
                >
                  No hay Datos de Caudales Disponibles
                </div>
              </v-tabs-window-item>

              <v-tabs-window-item value="precipitaciones">
                <v-sheet
                  v-if="precipitationsForecastHarmonie || precipitationsForecastEpstat"
                  class="pa-5"
                >
                  <PrecipitationsChart
                    :forecast-harmonie="precipitationsForecastHarmonie"
                    :forecast-epsat="precipitationsForecastEpstat"
                    :forecast-ens-p10="precipitationsForecastEnsP10"
                    :forecast-ens-p25="precipitationsForecastEnsP25"
                    :forecast-ens-p90="precipitationsForecastEnsP90"
                    :forecast-ens-p75="precipitationsForecastEnsP75"
                  />
                </v-sheet>

                <!-- show skeleton while loading and keep reserved height to avoid layout jumps -->
                <div
                  v-else-if="loadingPrecipitaciones || loadingCaudales"
                  style="height: 550px; display: flex; align-items: center; justify-content: center"
                >
                  <v-skeleton-loader style="width: 100%; height: 100%" type="image" />
                </div>

                <div
                  v-else-if="
                    !loadingPrecipitaciones &&
                    (selectedSimulationDate || availableDates.length === 0)
                  "
                  style="height: 550px; display: flex; align-items: center; justify-content: center"
                >
                  No hay Datos de Precipitaciones Disponibles
                </div>
              </v-tabs-window-item>
            </v-tabs-window>
          </v-sheet>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="2">
      <v-card class="ma-2 pa-2 bg-background" elevation="2">
        <v-row>
          <v-col cols="12">
            <ContentSaihPredictionsLatest />
          </v-col>
          <v-col cols="12">
            <ContentSaihPredictionsWeek />
          </v-col>
        </v-row>
      </v-card>
    </v-col>
  </v-row>

  <v-row no-gutters class="pl-2 pr-2">
    <v-col cols="12" md="7">
      <ContentSaihCaudalMatrix
        :forecast-harmonie="caudalForecastHarmonie"
        :forecast-epsat="caudalForecastEpstat"
        :thresholds="feature?.properties as Record<string, unknown>"
        :loading="loadingCaudales"
      />
    </v-col>

    <v-col cols="12" md="5" class="pl-2 pr-2">
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
            <ForecastChartNew
              :forecast-ens-p10="caudalForecastEnsP10"
              :forecast-ens-p25="caudalForecastEnsP25"
              :forecast-ens-p90="caudalForecastEnsP90"
              :forecast-ens-p75="caudalForecastEnsP75"
              :toolbar="false"
              :height="220"
            />
          </div>

          <div
            v-else-if="loadingCaudales"
            style="height: 160px; display: flex; align-items: center; justify-content: center"
          >
            <v-skeleton-loader style="width: 100%; height: 100%" type="image" />
          </div>

          <div
            v-else
            style="height: 160px; display: flex; align-items: center; justify-content: center"
          >
            No hay datos de percentiles disponibles
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { getWFSFeatureById } from '@/services/geoserver'
  import { dynamicLayersConfig } from '@/config/layers.config'
  import type { WFSLayerConfig } from '@/types/Layers'
  import { formatSimulationDate } from '@/utils/dates'
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

  const precipitationsForecastEpstat = ref()
  const precipitationsForecastHarmonie = ref()

  const precipitationsForecastEnsP10 = ref()
  const precipitationsForecastEnsP25 = ref()
  const precipitationsForecastEnsP75 = ref()
  const precipitationsForecastEnsP90 = ref()

  const caudalForecastEpstat = ref()
  const caudalForecastHarmonie = ref()

  const caudalForecastEnsP10 = ref()
  const caudalForecastEnsP25 = ref()
  const caudalForecastEnsP75 = ref()
  const caudalForecastEnsP90 = ref()

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

  // Formatear fechas para el select
  const formattedDates = computed(() =>
    availableDates.value.map((date) => ({
      title: formatSimulationDate(date),
      value: date,
    }))
  )

  // cargar predicciones de precipitaciones
  async function loadCaudalPredictions() {
    if (!stationCode.value || !selectedSimulationDate.value) return

    loadingCaudales.value = true

    if (codeType.value === 'E') {
      try {
        const [iHarmonie, epsatMedio, ensP10Emb, ensP25Emb, ensP75Emb, ensP90Emb] =
          await Promise.all([
            getPredictionsService(stationCode.value, 'I.NAM.harmonie'),
            getPredictionsService(stationCode.value, 'I.NAM.ens.medio'),

            getPredictionsService(stationCode.value, 'I.NAM.ens', '', '10'),
            getPredictionsService(stationCode.value, 'I.NAM.ens', '', '25'),
            getPredictionsService(stationCode.value, 'I.NAM.ens', '', '75'),
            getPredictionsService(stationCode.value, 'I.NAM.ens', '', '90'),
          ])

        caudalForecastHarmonie.value = iHarmonie
        caudalForecastEpstat.value = epsatMedio

        caudalForecastEnsP10.value = ensP10Emb
        caudalForecastEnsP25.value = ensP25Emb
        caudalForecastEnsP75.value = ensP75Emb
        caudalForecastEnsP90.value = ensP90Emb
      } catch (err) {
        console.error('Error loading predictions:', err)
      } finally {
        loadingCaudales.value = false
      }
    } else {
      try {
        const [harmonie, epstat, ensP10, ensP25, ensP75, ensP90] = await Promise.all([
          getPredictionsService(stationCode.value, 'Q.NAM.harmonie'),
          getPredictionsService(stationCode.value, 'Q.NAM.ens'),

          getPredictionsService(stationCode.value, 'Q.NAM.ens', '', '10'),
          getPredictionsService(stationCode.value, 'Q.NAM.ens', '', '25'),
          getPredictionsService(stationCode.value, 'Q.NAM.ens', '', '75'),
          getPredictionsService(stationCode.value, 'Q.NAM.ens', '', '90'),
        ])

        caudalForecastHarmonie.value = harmonie
        caudalForecastEpstat.value = epstat

        caudalForecastEnsP10.value = ensP10
        caudalForecastEnsP25.value = ensP25
        caudalForecastEnsP75.value = ensP75
        caudalForecastEnsP90.value = ensP90
      } catch (err) {
        console.error('Error loading predictions:', err)
      } finally {
        loadingCaudales.value = false
      }
    }
  }

  // cargar predicciones de precipitaciones
  async function loadPrecipitationsPredictions() {
    if (!stationCode.value || !selectedSimulationDate.value) return

    loadingPrecipitaciones.value = true

    try {
      const [epstat, harmonie, ensP10, ensP25, ensP75, ensP90] = await Promise.all([
        getPredictionsService(stationCode.value, 'P.ens.forecast', selectedSimulationDate.value),
        getPredictionsService(stationCode.value, 'P.harmonie.forecast'),
        getPredictionsService(
          stationCode.value,
          'P.ens.forecast',
          selectedSimulationDate.value,
          '10'
        ),
        getPredictionsService(
          stationCode.value,
          'P.ens.forecast',
          selectedSimulationDate.value,
          '25'
        ),

        getPredictionsService(
          stationCode.value,
          'P.ens.forecast',
          selectedSimulationDate.value,
          '75'
        ),
        getPredictionsService(
          stationCode.value,
          'P.ens.forecast',
          selectedSimulationDate.value,
          '90'
        ),
      ])

      precipitationsForecastEpstat.value = epstat
      precipitationsForecastHarmonie.value = harmonie
      precipitationsForecastEnsP10.value = ensP10
      precipitationsForecastEnsP25.value = ensP25
      precipitationsForecastEnsP75.value = ensP75
      precipitationsForecastEnsP90.value = ensP90
    } catch (err) {
      console.error('Error loading predictions:', err)
    } finally {
      loadingPrecipitaciones.value = false
      loadingCaudales.value = false
    }
  }

  // cargar feature
  async function loadFeature(code: string) {
    if (!saihConfig.value) {
      console.warn('SAIH layer config not found')
      return
    }

    if (!code) {
      error.value = 'Station code is required'
      return
    }

    loadingFeature.value = true
    error.value = null

    try {
      // Cargar predicciones y feature en paralelo
      const [result, datesAvailable] = await Promise.all([
        getWFSFeatureById(saihConfig.value, 'codigo', code),
        getAvailablePredictionsService().catch((err) => {
          console.error('Error loading Available Dates', err)
          return []
        }),
      ])

      if (!result) {
        error.value = 'Feature not found'
        feature.value = null
        return
      }

      feature.value = result

      // Guardar fechas disponibles
      availableDates.value = datesAvailable
      if (datesAvailable.length > 0) {
        selectedSimulationDate.value = datesAvailable[0] // Seleccionar la más reciente por defecto
      }
      // Ajustar la pestaña activa según si la estación tiene caudal
      tab.value = hasCaudal.value ? 'caudal' : 'precipitaciones'
    } catch (err) {
      console.error('Error loading feature:', err)
      error.value = 'Error loading feature'
      feature.value = null
    } finally {
      loadingFeature.value = false
    }
  }

  // Cargar predicciones cuando cambia la fecha seleccionada
  watch(selectedSimulationDate, async () => {
    await loadPrecipitationsPredictions()
    if (hasCaudal.value) await loadCaudalPredictions()
  })

  // reaccionar al cambio de URL
  watch(
    stationCode,
    async (code) => {
      if (!code) {
        feature.value = null
        return
      }
      await loadFeature(code)
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
