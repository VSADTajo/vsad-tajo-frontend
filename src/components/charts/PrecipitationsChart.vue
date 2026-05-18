<template>
  <div class="precipitations-chart">
    <div v-if="loading" class="chart-loading-state" :style="{ height: `${chartHeight}px` }">
      <v-skeleton-loader type="image" class="h-100 w-100" />
    </div>
    <apexchart
      v-else-if="hasRenderableSeries"
      :height="chartHeight"
      :options="chartOptions"
      :series="series"
    />
    <div v-else class="chart-empty-state" :style="{ height: `${chartHeight}px` }">
      Sin datos para mostrar
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { ApexOptions } from 'apexcharts'
  import type { DataStationPrediction, Point, RangePoint, SeriesItem } from '@/types/Predictions'
  import { dateFormattedWithHours } from '@/utils/dates'

  const props = defineProps<{
    data: DataStationPrediction
    height?: number
    loading?: boolean
  }>()

  const chartHeight = computed(() => props.height ?? 550)

  function normalizePredictionResults(prediction?: DataStationPrediction['forecastHarmonie']) {
    if (!prediction?.results?.length) return null

    return prediction.results
      .map((result) => {
        const timestamp = new Date(result.date).getTime()
        if (!Number.isFinite(timestamp)) return null

        const numericValue = Number(result.value)
        return {
          date: result.date,
          value: Number.isFinite(numericValue) ? numericValue : null,
        }
      })
      .filter((item): item is { date: string; value: number | null } => item !== null)
  }

  const historicalData = computed(() => {
    return normalizePredictionResults(props.data.historical)
  })

  // Extraer fechas y valores de det
  const HarmonieData = computed(() => {
    return normalizePredictionResults(props.data.forecastHarmonie)
  })

  // Extraer fechas y valores de ens
  const epsatData = computed(() => {
    return normalizePredictionResults(props.data.forecastEpsat)
  })

  // Extraer fechas y valores de p10
  const p10Data = computed(() => {
    return normalizePredictionResults(props.data.forecastEnsP10)
  })

  // Extraer fechas y valores de p75
  const p75Data = computed(() => {
    return normalizePredictionResults(props.data.forecastEnsP75)
  })

  const p25Data = computed(() => {
    return normalizePredictionResults(props.data.forecastEnsP25)
  })

  // Extraer fechas y valores de p75
  const p90Data = computed(() => {
    return normalizePredictionResults(props.data.forecastEnsP90)
  })

  // Todas las fechas únicas ordenadas
  const allDates = computed(() => {
    const dateSet = new Set<string>()
    historicalData.value?.forEach((d) => dateSet.add(d.date))
    HarmonieData.value?.forEach((d) => dateSet.add(d.date))
    epsatData.value?.forEach((d) => dateSet.add(d.date))
    p10Data.value?.forEach((d) => dateSet.add(d.date))
    p75Data.value?.forEach((d) => dateSet.add(d.date))
    p25Data.value?.forEach((d) => dateSet.add(d.date))
    p90Data.value?.forEach((d) => dateSet.add(d.date))
    return Array.from(dateSet).sort()
  })

  // Categorías formateadas para el eje X (una por cada fecha)
  const xLabels = computed(() =>
    allDates.value.map((date) => dateFormattedWithHours(new Date(date).getTime()))
  )

  const observedEndLabel = computed(() => {
    if (!historicalData.value?.length) return null

    const lastObserved = [...historicalData.value]
      .reverse()
      .find((item) => Number.isFinite(item.value))

    if (!lastObserved) return null

    const index = allDates.value.lastIndexOf(lastObserved.date)
    if (index < 0) return null

    return xLabels.value[index] ?? null
  })

  const observedLastIndex = computed(() => {
    if (!historicalData.value?.length) return -1

    const lastObserved = [...historicalData.value]
      .reverse()
      .find((item) => Number.isFinite(item.value))

    if (!lastObserved) return -1
    return allDates.value.lastIndexOf(lastObserved.date)
  })

  const observedEndXAnnotation = computed(() => {
    if (!observedEndLabel.value) return []

    return [
      {
        x: observedEndLabel.value,
        borderColor: '#455A64',
        strokeDashArray: 4,
        label: {
          text: 'Tº',
          orientation: 'horizontal',
          style: {
            background: '#455A64',
            color: '#fff',
            fontSize: '10px',
          },
        },
      },
    ]
  })

  function hasFiniteValue(values: Array<number | null>): boolean {
    return values.some((value) => Number.isFinite(value))
  }

  function hasFiniteRange(values: Array<[number | null, number | null] | null>): boolean {
    return values.some(
      (range) =>
        Array.isArray(range) &&
        range.length === 2 &&
        Number.isFinite(range[0]) &&
        Number.isFinite(range[1])
    )
  }

  const series = computed<SeriesItem[]>(() => {
    if (allDates.value.length === 0) return []

    const result: SeriesItem[] = []
    const labels = xLabels.value

    // Observado
    if (historicalData.value) {
      const historicalMap = new Map(historicalData.value.map((d) => [d.date, d.value]))
      const values = allDates.value.map((date) => historicalMap.get(date) ?? null)
      if (hasFiniteValue(values)) {
        result.push({
          name: 'Observado',
          type: 'bar',
          data: allDates.value.map((date, i) => ({
            x: labels[i],
            y: values[i],
          })),
        })
      }
    }

    // P10-P90 RangeArea (must come before bars so it renders behind)
    if (p10Data.value && p90Data.value) {
      const p10Map = new Map(p10Data.value.map((d) => [d.date, d.value]))
      const p90Map = new Map(p90Data.value.map((d) => [d.date, d.value]))
      const ranges: Array<[number | null, number | null] | null> = allDates.value.map((date) => {
        const low = p10Map.get(date) ?? null
        const high = p90Map.get(date) ?? null
        return Number.isFinite(low) && Number.isFinite(high) ? [low, high] : null
      })
      if (hasFiniteRange(ranges)) {
        result.push({
          name: 'Percentiles P10-P90',
          type: 'rangeArea',
          data: allDates.value.map((date, i) => ({
            x: labels[i],
            y: ranges[i],
          })),
        })
      }
    }

    // P25-P75 RangeArea
    if (p25Data.value && p75Data.value) {
      const p25Map = new Map(p25Data.value.map((d) => [d.date, d.value]))
      const p75Map = new Map(p75Data.value.map((d) => [d.date, d.value]))
      const ranges: Array<[number | null, number | null] | null> = allDates.value.map((date) => {
        const low = p25Map.get(date) ?? null
        const high = p75Map.get(date) ?? null
        return Number.isFinite(low) && Number.isFinite(high) ? [low, high] : null
      })
      if (hasFiniteRange(ranges)) {
        result.push({
          name: 'Percentiles P25-P75',
          type: 'rangeArea',
          data: allDates.value.map((date, i) => ({
            x: labels[i],
            y: ranges[i],
          })),
        })
      }
    }

    // Harmonie
    if (HarmonieData.value) {
      const detMap = new Map(HarmonieData.value.map((d) => [d.date, d.value]))
      const values = allDates.value.map((date) => detMap.get(date) ?? null)
      if (hasFiniteValue(values)) {
        result.push({
          name: 'Predicción Det. Harmonie',
          type: 'bar',
          data: allDates.value.map((date, i) => ({
            x: labels[i],
            y: values[i],
          })),
        })
      }
    }

    // EPS
    if (epsatData.value) {
      const epsatMap = new Map(epsatData.value.map((d) => [d.date, d.value]))
      const values = allDates.value.map((date) => epsatMap.get(date) ?? null)
      if (hasFiniteValue(values)) {
        result.push({
          name: 'Predicción Prob. EPS',
          type: 'bar',
          data: allDates.value.map((date, i) => ({
            x: labels[i],
            y: values[i],
          })),
        })
      }
    }

    // Acumulados: observado, EPS medio y percentiles, todos partiendo del observado
    {
      const observedMap = historicalData.value
        ? new Map(historicalData.value.map((d) => [d.date, d.value]))
        : null
      const lastObservedIndex = observedLastIndex.value

      let observedCumulative = 0
      let hasObservedCumulative = false
      const observedCumulativeByIndex = allDates.value.map((date, i) => {
        if (lastObservedIndex < 0 || i > lastObservedIndex) return null

        const observedValue = observedMap?.get(date) ?? null
        if (Number.isFinite(observedValue)) {
          observedCumulative += Number(observedValue)
          hasObservedCumulative = true
          return observedCumulative
        }

        return hasObservedCumulative ? observedCumulative : null
      })

      const observedBaseline =
        lastObservedIndex >= 0 ? (observedCumulativeByIndex[lastObservedIndex] ?? null) : null

      const buildCumulativeSeries = (
        seriesName: string,
        futureMap: Map<string, number | null> | null,
        forceObservedOnly = false
      ) => {
        if (!observedMap && !futureMap) return

        let cumulative = Number(observedBaseline ?? 0)
        let hasStarted = false

        const cumulativeData = allDates.value.map((date, i) => {
          if (forceObservedOnly) {
            return {
              x: labels[i],
              y: observedCumulativeByIndex[i] ?? null,
            }
          }

          if (lastObservedIndex >= 0) {
            if (i < lastObservedIndex) {
              return { x: labels[i], y: null }
            }

            if (i === lastObservedIndex) {
              hasStarted = Number.isFinite(observedBaseline)
              return {
                x: labels[i],
                y: observedBaseline,
              }
            }
          }

          const sourceValue = futureMap?.get(date) ?? null
          if (Number.isFinite(sourceValue)) {
            cumulative += Number(sourceValue)
            hasStarted = true
            return { x: labels[i], y: cumulative }
          }

          return { x: labels[i], y: hasStarted ? cumulative : null }
        })

        if (hasFiniteValue(cumulativeData.map((point) => point.y))) {
          result.push({
            name: seriesName,
            type: 'line',
            data: cumulativeData,
          })
        }
      }

      const epsMap = epsatData.value ? new Map(epsatData.value.map((d) => [d.date, d.value])) : null
      const p10Map = p10Data.value ? new Map(p10Data.value.map((d) => [d.date, d.value])) : null
      const p25Map = p25Data.value ? new Map(p25Data.value.map((d) => [d.date, d.value])) : null
      const p75Map = p75Data.value ? new Map(p75Data.value.map((d) => [d.date, d.value])) : null
      const p90Map = p90Data.value ? new Map(p90Data.value.map((d) => [d.date, d.value])) : null

      buildCumulativeSeries('Acumulado observado', null, true)
      buildCumulativeSeries('Acumulado EPS medio', epsMap)
      buildCumulativeSeries('Acumulado P10', p10Map)
      buildCumulativeSeries('Acumulado P25', p25Map)
      buildCumulativeSeries('Acumulado P75', p75Map)
      buildCumulativeSeries('Acumulado P90', p90Map)
    }

    return result
  })

  const hasRenderableSeries = computed(() => series.value.length > 0)

  const isAccumulatedSeries = (name: string): boolean => name.startsWith('Acumulado')

  const dynamicYAxes = computed<ApexOptions['yaxis']>(() => {
    const firstAccumulatedIndex = series.value.findIndex((serie) => isAccumulatedSeries(serie.name))
    const firstInstantIndex = series.value.findIndex((serie) => !isAccumulatedSeries(serie.name))

    return series.value.map((serie, index) => {
      const isAccumulated = isAccumulatedSeries(serie.name)
      const shouldShowAxis = isAccumulated
        ? index === firstAccumulatedIndex
        : index === firstInstantIndex

      return {
        min: 0,
        opposite: isAccumulated,
        seriesName: serie.name,
        show: shouldShowAxis,
        title: shouldShowAxis ? { text: isAccumulated ? 'mm acumulado' : 'mm' } : { text: '' },
        labels: {
          show: shouldShowAxis,
          formatter: (value: number) => Number(value).toFixed(1),
        },
      }
    })
  })

  // Colores dinámicos basados en qué series existen (mismo orden que series)
  const dynamicColors = computed(() => {
    const names = new Set(series.value.map((serie) => serie.name))
    const colors: string[] = []
    if (names.has('Observado')) colors.push('#2E7D32') // Verde
    if (names.has('Percentiles P10-P90')) colors.push('#D3D3D3') // Gris claro
    if (names.has('Percentiles P25-P75')) colors.push('#696969') // Gris oscuro
    if (names.has('Predicción Det. Harmonie')) colors.push('#1565C0') // Azul
    if (names.has('Predicción Prob. EPS')) colors.push('#FF9800') // Amarillo
    if (names.has('Acumulado observado')) colors.push('#2E7D32')
    if (names.has('Acumulado EPS medio')) colors.push('#FF9800')
    if (names.has('Acumulado P10')) colors.push('#D3D3D3')
    if (names.has('Acumulado P25')) colors.push('#696969')
    if (names.has('Acumulado P75')) colors.push('#696969')
    if (names.has('Acumulado P90')) colors.push('#D3D3D3')
    return colors
  })

  // Opacidad de relleno por serie (rangeArea necesita opacidad explícita)
  const dynamicFillOpacity = computed(() => {
    const names = new Set(series.value.map((serie) => serie.name))
    const opacity: number[] = []
    if (names.has('Observado')) opacity.push(1)
    if (names.has('Percentiles P10-P90')) opacity.push(0.35)
    if (names.has('Percentiles P25-P75')) opacity.push(0.35)
    if (names.has('Predicción Det. Harmonie')) opacity.push(1)
    if (names.has('Predicción Prob. EPS')) opacity.push(1)
    if (names.has('Acumulado observado')) opacity.push(1)
    if (names.has('Acumulado EPS medio')) opacity.push(1)
    if (names.has('Acumulado P10')) opacity.push(1)
    if (names.has('Acumulado P25')) opacity.push(1)
    if (names.has('Acumulado P75')) opacity.push(1)
    if (names.has('Acumulado P90')) opacity.push(1)
    return opacity
  })

  // Ancho de trazo por serie
  const dynamicStrokeWidth = computed(() => {
    const names = new Set(series.value.map((serie) => serie.name))
    const widths: number[] = []
    if (names.has('Observado')) widths.push(2)
    if (names.has('Percentiles P10-P90')) widths.push(1)
    if (names.has('Percentiles P25-P75')) widths.push(1)
    if (names.has('Predicción Det. Harmonie')) widths.push(0)
    if (names.has('Predicción Prob. EPS')) widths.push(0)
    if (names.has('Acumulado observado')) widths.push(3)
    if (names.has('Acumulado EPS medio')) widths.push(2)
    if (names.has('Acumulado P10')) widths.push(2)
    if (names.has('Acumulado P25')) widths.push(2)
    if (names.has('Acumulado P75')) widths.push(2)
    if (names.has('Acumulado P90')) widths.push(2)
    return widths
  })

  const dynamicStrokeCurve = computed(() =>
    series.value.map((serie) => (serie.type === 'bar' ? 'straight' : 'smooth'))
  )

  const chartOptions = computed<ApexOptions>(() => ({
    chart: {
      type: 'line',
      stacked: false,
      height: chartHeight.value,
      zoom: { enabled: true, type: 'xy', autoScaleYaxis: false, allowMouseWheelZoom: false },
      toolbar: { show: true },
      events: {
        mounted: (chartContext: { el: HTMLElement }) => {
          try {
            const el = chartContext.el as HTMLElement
            // remove any SVG <title> that shows native 'Chart' tooltip
            el.querySelectorAll('svg title').forEach((t) => t.remove())
            // remove any nodes that contain the exact text 'Chart'
            el.querySelectorAll('*').forEach((n) => {
              if (n.textContent === 'Chart') n.remove()
            })
            // also clear title attribute if present
            if (el.getAttribute('title')) el.removeAttribute('title')
          } catch {
            // ignore
          }
        },
      },
    },
    colors: dynamicColors.value,
    fill: {
      opacity: dynamicFillOpacity.value,
    },
    stroke: {
      curve: dynamicStrokeCurve.value,
      lineCap: 'round',
      width: dynamicStrokeWidth.value,
    },
    legend: {
      position: 'bottom' as const,
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      type: 'category',
      tickPlacement: (allDates.value.length > 1 ? 'on' : 'between') as 'on' | 'between',
      tickAmount: allDates.value.length > 1 ? Math.min(8, allDates.value.length) : undefined,
      labels: {
        rotate: 0,
        rotateAlways: false,
        hideOverlappingLabels: true,
      },
    },
    yaxis: dynamicYAxes.value,
    annotations: {
      xaxis: observedEndXAnnotation.value,
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      // hide the small x-axis tooltip and auxiliary fixed tooltip
      x: { show: false },
      fixed: { enabled: false },
      onDatasetHover: { highlightDataSeries: false },
      custom: ({
        dataPointIndex,
        w,
      }: {
        dataPointIndex: number
        w: { config?: { series?: SeriesItem[] }; globals?: { colors?: string[] } }
      }) => {
        const cfgSeries = (w.config?.series ?? []) as SeriesItem[]
        // Try to get formatted date from any series' x value (handles hidden/disabled series)
        let dateFormatted = ''
        for (let si = 0; si < cfgSeries.length; si++) {
          const pt = cfgSeries[si]?.data?.[dataPointIndex]
          // pt can be a number or an object like Point/RangePoint — guard before accessing `x`
          if (pt && typeof pt === 'object' && 'x' in pt) {
            const candidate = (pt as { x?: unknown }).x
            if (candidate !== undefined && candidate !== null) {
              dateFormatted = String(candidate)
              break
            }
          }
        }
        // Fallback: build from allDates if no x found
        if (!dateFormatted) {
          const rawDate = allDates.value?.[dataPointIndex]
          dateFormatted = rawDate ? dateFormattedWithHours(new Date(rawDate).getTime()) : ''
        }

        let rows = ''
        cfgSeries.forEach((s: SeriesItem, idx: number) => {
          const point = s.data?.[dataPointIndex] as Point | RangePoint | number | null
          if (point === null || point === undefined) return
          let raw: number | [number | null, number | null] | null
          if (typeof point === 'object' && 'y' in point) raw = (point as Point | RangePoint).y
          else raw = point
          if (raw === null || raw === undefined) return

          const name = s.name ?? `Serie ${idx + 1}`
          const color = w.globals?.colors?.[idx] ?? '#ccc'
          const dot = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:8px;"></span>`

          if (Array.isArray(raw) && raw.length === 2) {
            const a = Number(raw[0])
            const b = Number(raw[1])
            if (Number.isFinite(a) && Number.isFinite(b)) {
              rows += `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;">
                  <span style="display:flex;align-items:center;">${dot}${name}</span>
                  <strong style="margin-left:16px;">${Math.min(a, b).toFixed(2)} - ${Math.max(a, b).toFixed(2)} mm</strong>
                </div>`
            }
          } else {
            const val = Number(raw)
            if (Number.isFinite(val)) {
              rows += `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;">
                  <span style="display:flex;align-items:center;">${dot}${name}</span>
                  <strong style="margin-left:16px;">${val.toFixed(2)} mm</strong>
                </div>`
            }
          }
        })

        return `
          <div style="min-width:280px;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.15);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;">
            <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:10px 14px;font-weight:600;">
              ${dateFormatted}
            </div>
            <div style="background:#fff;color:#333;padding:8px 14px;">
              ${rows || '<div style="padding:4px 0;color:#999;">Sin datos</div>'}
            </div>
          </div>`
      },
    },
  }))
</script>

<style>
  .chart-loading-state {
    display: flex;
    align-items: stretch;
    justify-content: stretch;
  }

  .chart-empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(0, 0, 0, 0.6);
    font-size: 0.875rem;
  }

  /* Oculta el pequeño tooltip nativo del eje X que aparece bajo el gráfico */
  .apexcharts-xaxistooltip {
    display: none !important;
  }

  .precipitations-chart .apexcharts-legend {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px 12px;
    align-items: start;
    justify-items: start;
    overflow: hidden !important;
  }

  .precipitations-chart .apexcharts-legend-series {
    display: flex !important;
    align-items: flex-start;
    margin: 0 !important;
    width: 100% !important;
    min-height: 28px;
    min-width: 0;
  }

  .precipitations-chart .apexcharts-legend-text {
    white-space: normal !important;
    line-height: 1.2;
  }

  @media (max-width: 960px) {
    .precipitations-chart .apexcharts-legend {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .precipitations-chart .apexcharts-legend-series {
      min-height: 24px;
    }
  }

  @media (max-width: 600px) {
    .precipitations-chart .apexcharts-legend {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
