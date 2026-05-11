<template>
  <v-card class="pa-2 bg-background" elevation="2">
    <v-progress-linear v-if="loading" indeterminate />

    <!-- Skeleton while loading -->
    <template v-if="loading">
      <div class="pa-4">
        <v-skeleton-loader type="heading" height="28" class="mb-2" />
        <v-skeleton-loader type="text" height="18" class="mb-2" />
        <v-skeleton-loader type="list-item" class="mb-2" />
      </div>
    </template>

    <template v-else-if="route.query.subcuenca">
      <!-- Header estilo RightContentSaih -->
      <v-card-title class="d-flex justify-space-between align-start pa-6" :style="headerStyle">
        <div>
          <div class="text-h6 font-weight-bold" style="color: white">
            {{ feature?.properties?.nombre ?? route.query.subcuenca }}
          </div>
          <div
            v-if="feature?.properties?.code"
            class="text-caption"
            style="color: rgba(255, 255, 255, 0.9)"
          >
            {{ feature.properties.name }}
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
        <!-- Chip tipo -->
        <div class="d-flex justify-space-between align-center flex-wrap ga-4 w-100">
          <div class="mb-3 mt-2">
            <v-chip
              prepend-icon="mdi-shape"
              color="deep-orange"
              variant="tonal"
              size="small"
              class="font-weight-bold"
            >
              Subcuenca
            </v-chip>
          </div>

          <div
            v-if="areaValue || perimeterValue"
            class="mb-3 mt-2 d-flex flex-wrap ga-2 ms-auto justify-end"
          >
            <v-chip v-if="areaValue" size="small" variant="outlined">
              Area: {{ Number(areaValue).toFixed(2) }} km2
            </v-chip>
            <v-chip v-if="perimeterValue" size="small" variant="outlined">
              Perimetro: {{ Number(perimeterValue).toFixed(2) }} km
            </v-chip>
          </div>
        </div>

        <v-divider class="mb-3" />

        <v-row>
          <v-col cols="12" sm="4">
            <MapDetail type="subcuencas" />
          </v-col>
          <v-col cols="12" sm="8">
            <SubcuencaStationsTable />
          </v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12">
            <v-card class="pa-2 bg-background" elevation="2">
              <template v-if="selectedChartData">
                <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
                  {{
                    selectedSeries === 'caudal'
                      ? `Caudal - ${selectedStationName}`
                      : `Precipitación - ${selectedStationName}`
                  }}
                </v-card-title>

                <v-card-text class="bg-surface mt-2 border-radius-4" elevation="2">
                  <ForecastChartNew
                    v-if="selectedSeries === 'caudal'"
                    :data="selectedChartData"
                    :height="360"
                    :toolbar="false"
                  />
                  <PrecipitationsChart
                    v-else
                    :data="selectedChartData"
                    :height="360"
                    :loading="false"
                  />
                </v-card-text>
              </template>

              <v-card-text v-else class="text-medium-emphasis">
                Selecciona una estación en la tabla para ver su gráfica.
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </template>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import type { DataStationPrediction } from '@/types/Predictions'
  import {
    useSubcuencaSelectionBus,
    type SubcuencaSeriesMode,
  } from '@/composables/useSubcuencaSelectionBus'
  import ForecastChartNew from '../charts/ForecastChartNew.vue'
  import PrecipitationsChart from '../charts/PrecipitationsChart.vue'
  import MapDetail from './MapDetail.vue'
  import SubcuencaStationsTable from './SubcuencaStationsTable.vue'
  import { getWFSFeatureById } from '@/services/geoserver'
  import { dynamicLayersConfig } from '@/config/layers.config'
  import type { WFSLayerConfig } from '@/types/Layers'

  const HEADER_BASE = '#edc1a8'
  const HEADER_DARK = '#b8745f'

  const route = useRoute()
  const router = useRouter()
  const selectionBus = useSubcuencaSelectionBus()

  const loading = ref(false)
  const feature = ref<GeoJSON.Feature | null>(null)
  const selectedChartData = ref<DataStationPrediction | null>(null)
  const selectedSeries = ref<SubcuencaSeriesMode>('caudal')
  const selectedStationName = ref('')

  const headerStyle = computed(() => ({
    background: `linear-gradient(135deg, ${HEADER_BASE} 0%, ${HEADER_DARK} 100%)`,
    margin: '-8px -8px 0 -8px',
  }))

  const areaValue = computed(() => {
    const props = feature.value?.properties
    if (!props?.area) return ''
    return String(props.area)
  })

  const perimeterValue = computed(() => {
    const props = feature.value?.properties
    if (!props?.perimetro) return ''
    return String(props.perimetro)
  })

  const subcuencaConfig = computed(
    () => dynamicLayersConfig.find((l) => l.id === 'subcuencas') as WFSLayerConfig | undefined
  )

  async function loadFeature(code: string) {
    if (!subcuencaConfig.value) return
    loading.value = true
    try {
      feature.value = await getWFSFeatureById(subcuencaConfig.value, 'code', code)
    } catch {
      feature.value = null
    } finally {
      loading.value = false
    }
  }

  watch(
    () => route.query.subcuenca as string | undefined,
    (code) => {
      feature.value = null
      selectedChartData.value = null
      if (code) loadFeature(code)
    },
    { immediate: true }
  )

  const stopBusListener = selectionBus.on((payload) => {
    selectedSeries.value = payload.series
    selectedChartData.value = payload.data
    selectedStationName.value = payload.station?.nombre ?? ''
  })

  onBeforeUnmount(() => {
    stopBusListener()
  })

  function closeDrawer() {
    if (!route.query.subcuenca) return

    const query = { ...route.query }
    delete query.subcuenca

    router.replace({ query })
  }
</script>
