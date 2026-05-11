<template>
  <v-card class="pa-4 bg-background" elevation="2">
    <v-card-title class="d-flex justify-space-between align-start">
      <div>
        <div class="text-h6 font-weight-bold">Precipitación horaria</div>
        <div v-if="layerName" class="text-caption text-medium-emphasis">{{ layerName }}</div>
        <div v-if="coords" class="text-caption text-medium-emphasis">
          {{ coords.lat }}, {{ coords.lng }}
        </div>
      </div>
      <v-btn icon="mdi-close" variant="text" size="small" @click="closeDrawer" />
    </v-card-title>

    <v-divider class="my-3" />

    <v-progress-linear v-if="loading" indeterminate class="mb-2" />

    <v-card-text>
      <!-- Información de ubicación -->
      <v-sheet class="pa-3 mb-4 rounded" elevation="1">
        <div class="text-caption font-weight-bold text-medium-emphasis mb-3">UBICACIÓN</div>

        <v-row v-if="loading" dense>
          <v-col cols="12" md="4">
            <v-skeleton-loader type="text" class="mb-2" />
          </v-col>
          <v-col cols="12" md="4">
            <v-skeleton-loader type="text" class="mb-2" />
          </v-col>
          <v-col cols="12" md="4">
            <v-skeleton-loader type="text" class="mb-2" />
          </v-col>
        </v-row>

        <v-row v-else dense>
          <v-col cols="12" md="4">
            <div class="text-caption text-medium-emphasis">Subcuenca</div>
            <div class="text-body-2 font-weight-medium">
              {{ locationInfo.subcuenca || '-' }}
            </div>
          </v-col>

          <v-col cols="12" md="4">
            <div class="text-caption text-medium-emphasis">Sistema</div>
            <div class="text-body-2 font-weight-medium">
              {{ locationInfo.sistema || '-' }}
            </div>
          </v-col>

          <v-col cols="12" md="4">
            <div class="text-caption text-medium-emphasis">Zona</div>
            <div class="text-body-2 font-weight-medium">
              {{ locationInfo.zona || '-' }}
            </div>
          </v-col>
        </v-row>
      </v-sheet>

      <v-sheet class="pa-4" rounded elevation="1">
        <div class="text-subtitle-2 font-weight-medium mb-3">Precipitación por hora</div>

        <v-skeleton-loader v-if="chartLoading" type="image" height="320" />

        <apexchart
          v-else-if="hasChartData"
          type="bar"
          height="320"
          :options="chartOptions"
          :series="chartSeries"
        />

        <div
          v-else
          class="d-flex flex-column align-center justify-center py-10 text-medium-emphasis"
        >
          <v-icon size="42" class="mb-2">mdi-chart-bar</v-icon>
          <div>Sin datos de precipitación para este punto</div>
          <div class="text-caption mt-1">Lat: {{ coords?.lat }} — Lng: {{ coords?.lng }}</div>
        </div>
      </v-sheet>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import type { ApexOptions } from 'apexcharts'
  import { useRoute, useRouter } from 'vue-router'
  import { usePrecipitacionLocationInfo } from '@/composables/usePrecipitacionLocationInfo'
  import { useLayersStore } from '@/stores/layersStore'
  import { dynamicLayersConfig } from '@/config/layers.config'
  import { dateFormattedWithHours } from '@/utils/dates'
  import { fetchGeoServerLayerPointTimeSeries } from '@/services/geoserverWmsService'
  import type { WMSLayerConfig } from '@/types/Layers'

  const route = useRoute()
  const router = useRouter()
  const layersStore = useLayersStore()

  const coords = computed(() => {
    const raw = route.query.precipitacion as string | undefined
    if (!raw) return null
    const [lat, lng] = raw.split(',').map(Number)
    if (isNaN(lat) || isNaN(lng)) return null
    return { lat, lng }
  })

  const layerName = computed(() => {
    const id = route.query.precipitacionLayer as string | undefined
    if (!id) return null
    const labels: Record<string, string> = {
      eps_precipitacion_25: 'EPS Precipitación P25',
      eps_precipitacion_75: 'EPS Precipitación P75',
      eps_precipitacion_media: 'EPS Precipitación Media',
      harmonie_precipitacion: 'Harmonie Precipitación',
    }
    return labels[id] ?? id
  })

  const selectedLayerId = computed(() => route.query.precipitacionLayer as string | undefined)

  const selectedLayerConfig = computed(() => {
    const id = selectedLayerId.value
    if (!id) return null

    const config = dynamicLayersConfig.find((layer) => layer.id === id)
    if (!config || config.type !== 'WMS') return null

    return config as WMSLayerConfig
  })

  const selectedLayerState = computed(() => {
    const id = selectedLayerId.value
    if (!id) return null
    return layersStore.layers[id]
  })

  const chartLoading = ref(false)
  const chartSeries = ref<Array<{ name: string; data: Array<{ x: string; y: number | null }> }>>([])

  const hasChartData = computed(() =>
    chartSeries.value.some((serie) => serie.data.some((point) => Number.isFinite(point.y)))
  )

  const chartOptions = computed<ApexOptions>(() => ({
    chart: {
      type: 'bar',
      toolbar: { show: true },
      zoom: { enabled: true },
    },
    colors: ['#1E88E5'],
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '68%',
      },
    },
    xaxis: {
      type: 'category',
      labels: {
        rotate: -30,
        hideOverlappingLabels: true,
      },
    },
    yaxis: {
      min: 0,
      title: { text: 'mm' },
      labels: {
        formatter: (value: number) => value.toFixed(2),
      },
    },
    tooltip: {
      x: { show: true },
      y: {
        formatter: (value: number) => `${Number(value).toFixed(2)} mm`,
      },
    },
    noData: {
      text: 'Sin datos',
    },
  }))

  async function loadChartData() {
    const currentCoords = coords.value
    const layerConfig = selectedLayerConfig.value
    const layerState = selectedLayerState.value
    const temporal = layerState?.temporal

    console.log('[RightContentPrecipitacion] loadChartData called', {
      coords: currentCoords,
      selectedLayerId: selectedLayerId.value,
      hasLayerConfig: Boolean(layerConfig),
      layerConfig,
      layerState,
      temporal,
    })

    if (!currentCoords || !layerConfig || !temporal) {
      console.log(
        '[RightContentPrecipitacion] loadChartData skipped: missing coords/layerConfig/temporal'
      )
      chartSeries.value = []
      return
    }

    chartLoading.value = true

    try {
      console.log('[RightContentPrecipitacion] Fetching chart time series', {
        url: layerConfig.url,
        layerName: layerConfig.layers,
        lat: currentCoords.lat,
        lng: currentCoords.lng,
        startIso: temporal.start,
        endIso: temporal.end,
        stepHours: temporal.stepHours,
      })

      const timeSeries = await fetchGeoServerLayerPointTimeSeries({
        url: layerConfig.url,
        layerName: layerConfig.layers,
        lat: currentCoords.lat,
        lng: currentCoords.lng,
        startIso: temporal.start,
        endIso: temporal.end,
        stepHours: temporal.stepHours,
      })

      console.log('[RightContentPrecipitacion] Time series received', {
        points: timeSeries.length,
        sample: timeSeries.slice(0, 3),
      })

      chartSeries.value = [
        {
          name: layerName.value ?? 'Precipitación',
          data: timeSeries.map((entry) => ({
            x: dateFormattedWithHours(new Date(entry.time).getTime()),
            y: entry.value,
          })),
        },
      ]
    } catch {
      console.error('[RightContentPrecipitacion] loadChartData failed')
      chartSeries.value = []
    } finally {
      chartLoading.value = false
    }
  }

  const { loading, locationInfo, fetchLocationInfo } = usePrecipitacionLocationInfo(
    coords.value?.lat ?? null,
    coords.value?.lng ?? null
  )

  watch(
    () => route.query.precipitacion,
    (newPrecipitacion) => {
      console.log('[RightContentPrecipitacion] watch precip query', newPrecipitacion)
      if (newPrecipitacion) {
        const [lat, lng] = (newPrecipitacion as string).split(',').map(Number)
        console.log('[RightContentPrecipitacion] parsed coords from query', { lat, lng })
        if (!isNaN(lat) && !isNaN(lng)) {
          fetchLocationInfo(lat, lng)
          void loadChartData()
        }
      }
    },
    { immediate: true }
  )

  watch(
    () => [route.query.precipitacionLayer, selectedLayerState.value?.params?.time],
    (newValues) => {
      console.log('[RightContentPrecipitacion] watch layer/time changed', newValues)
      void loadChartData()
    }
  )

  function closeDrawer() {
    const queryObj = { ...route.query }
    delete queryObj.precipitacion
    delete queryObj.precipitacionLayer
    router.replace({ query: queryObj })
  }
</script>
