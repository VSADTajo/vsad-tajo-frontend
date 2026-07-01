<template>
  <div class="precip-accum-ts-chart">
    <div v-if="loading" :style="{ height: `${chartHeight}px` }">
      <v-skeleton-loader type="image" class="h-100 w-100" />
    </div>

    <apexchart
      v-else-if="hasData"
      type="line"
      :height="chartHeight"
      :options="chartOptions"
      :series="series"
    />

    <div
      v-else
      class="d-flex align-center justify-center text-caption text-medium-emphasis"
      :style="{ height: `${chartHeight}px` }"
    >
      Sin datos para mostrar
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  import type { ApexOptions } from 'apexcharts'

  import type { StationPrediction } from '@/types/Predictions'

  const props = withDefaults(
    defineProps<{
      precipitationsHistorical?: StationPrediction

      precipitationsForecastHarmonie?: StationPrediction

      precipitationsForecastEpstat?: StationPrediction

      loading?: boolean

      height?: number
    }>(),

    {
      precipitationsHistorical: undefined,

      precipitationsForecastHarmonie: undefined,

      precipitationsForecastEpstat: undefined,

      loading: false,

      height: 400,
    }
  )

  const EPS_MAX_FORECAST_DAYS = 6

  const chartHeight = computed(() => props.height)

  type TsPoint = { x: number; y: number | null }

  type ChartSeries = { name: string; type: string; data: TsPoint[]; yAxisIndex?: number }

  function toHourlyPoints(prediction: StationPrediction | undefined): TsPoint[] {
    if (!prediction?.results?.length) return []

    return prediction.results

      .map((r) => {
        const ts = new Date(r.date).getTime()

        if (!Number.isFinite(ts)) return null

        const v = Number(r.value)

        return { x: ts, y: Number.isFinite(v) ? v : null }
      })

      .filter((p): p is TsPoint => p !== null)

      .sort((a, b) => a.x - b.x)
  }

  function aggregateToDaily(points: TsPoint[]): TsPoint[] {
    const byDay = new Map<string, number>()

    for (const pt of points) {
      if (pt.y === null || !Number.isFinite(pt.y)) continue

      const d = new Date(pt.x)

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      byDay.set(key, (byDay.get(key) ?? 0) + (pt.y as number))
    }

    return Array.from(byDay.entries())

      .sort(([a], [b]) => a.localeCompare(b))

      .map(([key, sum]) => ({ x: new Date(`${key}T12:00:00`).getTime(), y: sum }))
  }

  const observedPoints = computed(() => toHourlyPoints(props.precipitationsHistorical))

  const observedEndTs = computed((): number | null => {
    const pts = observedPoints.value.filter((p) => p.y !== null)

    if (!pts.length) return null

    return pts[pts.length - 1].x
  })

  const harmoniePoints = computed((): TsPoint[] => {
    const endTs = observedEndTs.value

    return toHourlyPoints(props.precipitationsForecastHarmonie).filter((p) => !endTs || p.x > endTs)
  })

  const epsPoints = computed((): TsPoint[] => {
    const endTs = observedEndTs.value

    const cutoff = endTs ? endTs + EPS_MAX_FORECAST_DAYS * 24 * 60 * 60 * 1000 : null

    return toHourlyPoints(props.precipitationsForecastEpstat).filter(
      (p) => (!endTs || p.x > endTs) && (!cutoff || p.x <= cutoff)
    )
  })

  const series = computed((): ChartSeries[] => {
    const result: ChartSeries[] = []

    if (observedPoints.value.length) {
      result.push({ name: 'Observado (horario)', type: 'bar', data: observedPoints.value })

      const daily = aggregateToDaily(observedPoints.value)

      if (daily.length) {
        result.push({ name: 'Observado (diario)', type: 'area', data: daily, yAxisIndex: 1 })
      }
    }

    if (harmoniePoints.value.length) {
      result.push({ name: 'Harmonie (horario)', type: 'bar', data: harmoniePoints.value })

      const daily = aggregateToDaily(harmoniePoints.value)

      if (daily.length) {
        result.push({ name: 'Harmonie (diario)', type: 'area', data: daily, yAxisIndex: 1 })
      }
    }

    if (epsPoints.value.length) {
      result.push({ name: 'EPS Medio (horario)', type: 'bar', data: epsPoints.value })

      const daily = aggregateToDaily(epsPoints.value)

      if (daily.length) {
        result.push({ name: 'EPS Medio (diario)', type: 'area', data: daily, yAxisIndex: 1 })
      }
    }

    return result
  })

  const hasData = computed(() => series.value.some((s) => s.data.length > 0))

  const SERIES_COLORS: Record<string, string> = {
    'Observado (horario)': '#2E7D32',

    'Observado (diario)': '#81C784',

    'Harmonie (horario)': '#1565C0',

    'Harmonie (diario)': '#64B5F6',

    'EPS Medio (horario)': '#E65100',

    'EPS Medio (diario)': '#FFB74D',
  }

  const dynamicColors = computed(() => series.value.map((s) => SERIES_COLORS[s.name] ?? '#9E9E9E'))

  const dynamicFillOpacity = computed(() =>
    series.value.map((s) => (s.type === 'area' ? 0.3 : 0.9))
  )

  const dynamicStrokeWidth = computed(() => series.value.map((s) => (s.type === 'bar' ? 0 : 2)))

  const observedEndAnnotation = computed(() => {
    const ts = observedEndTs.value

    if (!ts) return []

    return [
      {
        x: ts,
        borderColor: '#455A64',
        strokeDashArray: 4,
        label: {
          text: 'Tº',
          orientation: 'horizontal',
          style: { background: '#455A64', color: '#fff', fontSize: '10px' },
        },
      },
    ]
  })

  const chartOptions = computed<ApexOptions>(() => ({
    chart: {
      type: 'line',
      stacked: false,
      zoom: { enabled: true, type: 'x', autoScaleYaxis: false, allowMouseWheelZoom: false },
      toolbar: {
        show: true,
        tools: { download: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true },
      },
    },

    colors: dynamicColors.value,

    fill: { opacity: dynamicFillOpacity.value },

    stroke: {
      width: dynamicStrokeWidth.value,

      curve: 'smooth',
    },

    dataLabels: { enabled: false },

    plotOptions: {
      bar: { columnWidth: '80%' },
    },

    xaxis: {
      type: 'datetime',

      labels: {
        datetimeUTC: false,

        datetimeFormatter: {
          year: 'yyyy',

          month: "MMM 'yy",

          day: 'dd/MM',

          hour: 'dd/MM HH:mm',
        },
      },
    },

    yaxis: [
      {
        min: 0,

        title: { text: 'mm/hora' },

        labels: { formatter: (v: number) => Number(v).toFixed(1) },
      },

      {
        opposite: true,

        min: 0,

        title: { text: 'mm/día' },

        labels: { formatter: (v: number) => Number(v).toFixed(1) },
      },
    ],

    tooltip: {
      shared: true,

      intersect: false,

      followCursor: true,

      x: { format: 'dd/MM HH:mm' },
    },

    annotations: {
      xaxis: observedEndAnnotation.value,
    },

    legend: {
      position: 'bottom',

      horizontalAlign: 'center',
    },
  }))
</script>

<style scoped>
  .precip-accum-ts-chart .apexcharts-tooltip {
    pointer-events: none !important;
  }
</style>
