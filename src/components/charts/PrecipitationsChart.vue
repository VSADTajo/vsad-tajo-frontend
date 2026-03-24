<template>
  <apexchart :type="chartType" height="550" :options="chartOptions" :series="series" />
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { ApexOptions } from 'apexcharts'
  import type { ApexTooltipContext } from '@/types/Forecast'
  import type { StationPrediction } from '@/types/Predictions'
  import type { TelemetryRecord } from '@/types/Precipitation'
  import { dateFormattedWithHours, dateFormattedWithHoursAndMinutes } from '@/utils/dates'

  type TimeseriePoint = {
    x: number
    y: number | [number, number]
  }

  type TooltipPoint = {
    x: number | string | Date
    y: number | [number, number]
  }

  type TooltipSeries = {
    name: string
    data: TooltipPoint[]
  }

  const props = defineProps<{
    forecastDet?: StationPrediction
    forecastEns?: StationPrediction
    observed?: TelemetryRecord[]
    unit: string
    chartType: 'line' | 'bar'
    percentileKeys: {
      median: string
      p90: string
      p75: string
      p25: string
      p10: string
    }
    labels: {
      observed: string
      p1090: string
      p2575: string
      eps: string
      harmonie: string
    }
    extraOptions?: ApexOptions
  }>()

  function toTimestamp(date?: string | null): number | null {
    if (!date) return null

    const ts = new Date(date).getTime()
    return Number.isNaN(ts) ? null : ts
  }

  function normalizeObservedItem(item: any): { x: number; y: number } | null {
    if (!item) return null

    if (Array.isArray(item)) {
      const [date, value] = item
      const x = toTimestamp(date)
      const y = Number(value)

      if (x === null || Number.isNaN(y)) return null
      return { x, y }
    }

    const x = toTimestamp(item.date)
    const y = Number(item.value)

    if (x === null || Number.isNaN(y)) return null
    return { x, y }
  }

  function buildObservedSeries(): {
    name: string
    type?: 'line' | 'bar'
    data: TimeseriePoint[]
  } | null {
    if (!props.observed?.length) return null

    const data = props.observed
      .map((item: any) => normalizeObservedItem(item))
      .filter((point): point is { x: number; y: number } => point !== null)

    if (!data.length) return null

    return {
      name: props.labels.observed,
      type: props.chartType,
      data,
    }
  }
  function buildDeterministicSeries(prediction?: StationPrediction): {
    name: string
    type?: 'line' | 'bar'
    data: TimeseriePoint[]
  } | null {
    if (!prediction?.results?.length) return null

    const data = prediction.results
      .map((result): TimeseriePoint | null => {
        const x = toTimestamp(result.date)
        const y = Number(result.value)

        if (x === null || Number.isNaN(y)) return null

        return {
          x,
          y,
        }
      })
      .filter((point): point is TimeseriePoint => point !== null)

    if (!data.length) return null

    return {
      name: props.labels.harmonie,
      type: props.chartType,
      data,
    }
  }

  function isNotNull<T>(value: T | null): value is T {
    return value !== null
  }

  function buildBandSeries(
    prediction?: StationPrediction,
    lowerFlag?: number,
    upperFlag?: number,
    label?: string
  ): {
    name: string
    type?: 'line' | 'bar' | 'rangeArea'
    data: TimeseriePoint[]
  } | null {
    if (!prediction?.results?.length || lowerFlag === undefined || upperFlag === undefined) {
      return null
    }

    const grouped = new Map<number, StationPrediction['results']>()

    prediction.results.forEach((result) => {
      const ts = toTimestamp(result.date)
      if (ts === null) return

      if (!grouped.has(ts)) grouped.set(ts, [])
      grouped.get(ts)!.push(result)
    })

    const data: TimeseriePoint[] = []

    ;[...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .forEach(([ts, results]) => {
        const lowerResult = results.find((r) => r.flag === lowerFlag)
        const upperResult = results.find((r) => r.flag === upperFlag)

        if (!lowerResult || !upperResult) return

        const lower = Number(lowerResult.value)
        const upper = Number(upperResult.value)

        if (Number.isNaN(lower) || Number.isNaN(upper)) return

        data.push({
          x: ts,
          y: [lower, upper],
        })
      })

    if (!data.length) return null

    return {
      name: label ?? '',
      type: 'rangeArea',
      data,
    }
  }

  function buildMedianSeries(
    prediction?: StationPrediction,
    medianFlag?: number
  ): {
    name: string
    type?: 'line' | 'bar' | 'rangeArea'
    data: TimeseriePoint[]
  } | null {
    if (!prediction?.results?.length || medianFlag === undefined) return null

    const data = prediction.results
      .filter((result) => result.flag === medianFlag)
      .map((result): TimeseriePoint | null => {
        const x = toTimestamp(result.date)
        const y = Number(result.value)

        if (x === null || Number.isNaN(y)) return null

        return {
          x,
          y,
        }
      })
      .filter(isNotNull)
      .sort((a, b) => Number(a.x) - Number(b.x))

    if (!data.length) return null

    return {
      name: props.labels.eps,
      type: 'line',
      data,
    }
  }

  const percentileFlagMap = computed(() => ({
    [props.percentileKeys.p10]: 10,
    [props.percentileKeys.p25]: 25,
    [props.percentileKeys.median]: 50,
    [props.percentileKeys.p75]: 75,
    [props.percentileKeys.p90]: 90,
  }))

  const series = computed(() => {
    const result: Array<{
      name: string
      type?: any
      data: TimeseriePoint[]
    }> = []

    const observedSeries = buildObservedSeries()
    const detSeries = buildDeterministicSeries(props.forecastDet)

    const p10 = percentileFlagMap.value[props.percentileKeys.p10]
    const p25 = percentileFlagMap.value[props.percentileKeys.p25]
    const p50 = percentileFlagMap.value[props.percentileKeys.median]
    const p75 = percentileFlagMap.value[props.percentileKeys.p75]
    const p90 = percentileFlagMap.value[props.percentileKeys.p90]

    const band1090 = buildBandSeries(props.forecastEns, p10, p90, props.labels.p1090)
    const band2575 = buildBandSeries(props.forecastEns, p25, p75, props.labels.p2575)
    const medianSeries = buildMedianSeries(props.forecastEns, p50)

    if (observedSeries) result.push(observedSeries)
    if (band1090) result.push(band1090)
    if (band2575) result.push(band2575)
    if (medianSeries) result.push(medianSeries)
    if (detSeries) result.push(detSeries)

    return result
  })

  const baseOptions = computed<ApexOptions>(() => ({
    chart: {
      zoom: { enabled: true },
      toolbar: { show: true },
    },

    stroke: {
      curve: 'smooth',
    },

    yaxis: [
      {
        title: { text: props.unit },
        decimalsInFloat: 1,
        labels: {
          formatter: (value: number) => value.toFixed(1),
        },
      },
    ],

    tooltip: {
      shared: true,
      intersect: false,
      custom({ seriesIndex, dataPointIndex, w }: ApexTooltipContext) {
        const x = w.globals.seriesX?.[seriesIndex]?.[dataPointIndex]
        if (x == null) return ''

        const date = dateFormattedWithHoursAndMinutes(x)

        let html = `
    <div style="font-size:12px;min-width:180px">
      <div style="background:#f2f2f2;padding:6px 8px;font-weight:600;border-bottom:1px solid #ddd">
        ${date}
      </div>
  `

        ;(w.config.series as TooltipSeries[]).forEach((s) => {
          const point = s.data.find((d) => Number(d.x) === Number(x))
          if (!point) return

          const text = Array.isArray(point.y)
            ? `${point.y[0].toFixed(1)} - ${point.y[1].toFixed(1)} ${props.unit}`
            : `${point.y.toFixed(1)} ${props.unit}`

          html += `
      <div style="display:flex;justify-content:space-between;padding:4px 8px">
        <span>${s.name}</span>
        <span style="font-weight:600">${text}</span>
      </div>
    `
        })

        html += `</div>`
        return html
      },
    },

    xaxis: {
      type: 'datetime',
      tooltip: { enabled: false },
      labels: {
        formatter: (value: string) => dateFormattedWithHours(Number(value)),
      },
    },
  }))

  const chartOptions = computed(() => ({
    ...baseOptions.value,
    ...props.extraOptions,
  }))
</script>
