<template>
  <div>
    <apexchart height="550" :options="chartOptions" :series="series" />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { ApexOptions } from 'apexcharts'
  import type { Point, RangePoint, SeriesItem, StationPrediction } from '@/types/Predictions'
  import { dateFormattedWithHours } from '@/utils/dates'

  const props = defineProps<{
    forecastHarmonie?: StationPrediction
    forecastIHarmonie?: StationPrediction
    forecastEpsat?: StationPrediction
    forecastIEpsatMedio?: StationPrediction
    forecastEnsP10?: StationPrediction
    forecastEnsP25?: StationPrediction
    forecastEnsP90?: StationPrediction
    forecastEnsP75?: StationPrediction
  }>()

  // Extraer fechas y valores de det
  const HarmonieData = computed(() => {
    if (!props.forecastHarmonie?.results?.length) return null
    return props.forecastHarmonie.results.map((r) => ({
      date: r.date,
      value: Number(r.value),
    }))
  })

  const IHarmonieData = computed(() => {
    if (!props.forecastIHarmonie?.results?.length) return null
    return props.forecastIHarmonie.results.map((r) => ({
      date: r.date,
      value: Number(r.value),
    }))
  })

  // Extraer fechas y valores de ens
  const epsatData = computed(() => {
    if (!props.forecastEpsat?.results?.length) return null
    return props.forecastEpsat.results.map((r) => ({
      date: r.date,
      value: Number(r.value),
    }))
  })

  const epsatMedioData = computed(() => {
    if (!props.forecastIEpsatMedio?.results?.length) return null
    return props.forecastIEpsatMedio.results.map((r) => ({
      date: r.date,
      value: Number(r.value),
    }))
  })

  // Extraer fechas y valores de p10
  const p10Data = computed(() => {
    if (!props.forecastEnsP10?.results?.length) return null
    return props.forecastEnsP10.results.map((r) => ({
      date: r.date,
      value: Number(r.value),
    }))
  })

  // Extraer fechas y valores de p75
  const p75Data = computed(() => {
    if (!props.forecastEnsP75?.results?.length) return null
    return props.forecastEnsP75.results.map((r) => ({
      date: r.date,
      value: Number(r.value),
    }))
  })

  const p25Data = computed(() => {
    if (!props.forecastEnsP25?.results?.length) return null
    return props.forecastEnsP25.results.map((r) => ({
      date: r.date,
      value: Number(r.value),
    }))
  })

  // Extraer fechas y valores de p90
  const p90Data = computed(() => {
    if (!props.forecastEnsP90?.results?.length) return null
    return props.forecastEnsP90.results.map((r) => ({
      date: r.date,
      value: Number(r.value),
    }))
  })

  // Todas las fechas únicas ordenadas
  const allDates = computed(() => {
    const dateSet = new Set<string>()

    HarmonieData.value?.forEach((d) => dateSet.add(d.date))
    IHarmonieData.value?.forEach((d) => dateSet.add(d.date))
    epsatData.value?.forEach((d) => dateSet.add(d.date))
    epsatMedioData.value?.forEach((d) => dateSet.add(d.date))
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

  // Series para el gráfico
  const series = computed<SeriesItem[]>(() => {
    if (allDates.value.length === 0) return []

    const result: SeriesItem[] = []
    const labels = xLabels.value

    // P10-P90 RangeArea (must come before bars so it renders behind)
    if (p10Data.value && p90Data.value) {
      const p10Map = new Map(p10Data.value.map((d) => [d.date, d.value]))
      const p90Map = new Map(p90Data.value.map((d) => [d.date, d.value]))
      result.push({
        name: 'Percentiles P10-P90',
        type: 'rangeArea',
        data: allDates.value.map((date, i) => ({
          x: labels[i],
          y: [p10Map.get(date) ?? null, p90Map.get(date) ?? null],
        })),
      })
    }

    // P25-P75 RangeArea
    if (p25Data.value && p75Data.value) {
      const p25Map = new Map(p25Data.value.map((d) => [d.date, d.value]))
      const p75Map = new Map(p75Data.value.map((d) => [d.date, d.value]))
      result.push({
        name: 'Percentiles P25-P75',
        type: 'rangeArea',
        data: allDates.value.map((date, i) => ({
          x: labels[i],
          y: [p25Map.get(date) ?? null, p75Map.get(date) ?? null],
        })),
      })
    }

    // Harmonie
    if (HarmonieData.value) {
      const detMap = new Map(HarmonieData.value.map((d) => [d.date, d.value]))
      result.push({
        name: 'Predicción Det. Harmonie',
        type: 'line',
        data: allDates.value.map((date, i) => ({
          x: labels[i],
          y: detMap.get(date) ?? null,
        })),
      })
    }

    // IHarmonie
    if (IHarmonieData.value) {
      const iDetMap = new Map(IHarmonieData.value.map((d) => [d.date, d.value]))
      result.push({
        name: 'Predicción Ind. Harmonie',
        type: 'line',
        data: allDates.value.map((date, i) => ({
          x: labels[i],
          y: iDetMap.get(date) ?? null,
        })),
      })
    }

    // EPS
    if (epsatData.value) {
      const epsatMap = new Map(epsatData.value.map((d) => [d.date, d.value]))
      result.push({
        name: 'Predicción Det. EPS',
        type: 'line',
        data: allDates.value.map((date, i) => ({
          x: labels[i],
          y: epsatMap.get(date) ?? null,
        })),
      })
    }

    if (epsatMedioData.value) {
      const epsatMedioMap = new Map(epsatMedioData.value.map((d) => [d.date, d.value]))
      result.push({
        name: 'Predicción Ind. EPS',
        type: 'line',
        data: allDates.value.map((date, i) => ({
          x: labels[i],
          y: epsatMedioMap.get(date) ?? null,
        })),
      })
    }

    console.log('Series generadas para el gráfico:', result)
    return result
  })

  // Colores dinámicos basados en qué series existen (mismo orden que series)
  const dynamicColors = computed(() => {
    const colors: string[] = []
    if (p10Data.value && p90Data.value) colors.push('#D3D3D3') // Gris claro
    if (p25Data.value && p75Data.value) colors.push('#696969') // Gris oscuro
    if (HarmonieData.value) colors.push('#1565C0') // Azul
    if (IHarmonieData.value) colors.push('#006600') // Verde
    if (epsatData.value) colors.push('#FF9800') // Amarillo
    if (epsatMedioData.value) colors.push('#FF6666') // Rojo
    return colors
  })

  // Opacidad de relleno por serie (rangeArea necesita opacidad explícita)
  const dynamicFillOpacity = computed(() => {
    const opacity: number[] = []
    if (p10Data.value && p90Data.value) opacity.push(0.35)
    if (p25Data.value && p75Data.value) opacity.push(0.35)
    if (HarmonieData.value) opacity.push(1)
    if (IHarmonieData.value) opacity.push(1)
    if (epsatData.value) opacity.push(1)
    if (epsatMedioData.value) opacity.push(1)

    return opacity
  })

  // Ancho de trazo por serie
  const dynamicStrokeWidth = computed(() => {
    const widths: number[] = []
    if (p10Data.value && p90Data.value) widths.push(1)
    if (p25Data.value && p75Data.value) widths.push(1)
    if (HarmonieData.value) widths.push(2)
    if (IHarmonieData.value) widths.push(2)
    if (epsatData.value) widths.push(2)
    if (epsatMedioData.value) widths.push(2)
    return widths
  })

  const chartOptions = computed<ApexOptions>(() => ({
    chart: {
      type: 'line',
      stacked: false,
      height: 550,
      zoom: { enabled: true },
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
      curve: 'smooth',
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
      tickPlacement: 'on' as const,
      tickAmount: 8,
      labels: {
        rotate: 0,
        rotateAlways: false,
        hideOverlappingLabels: true,
      },
    },
    yaxis: {
      min: 0,
      title: { text: 'm3/s' },
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
                  <strong style="margin-left:16px;">${Math.min(a, b).toFixed(2)} - ${Math.max(a, b).toFixed(2)} m3/s</strong>
                </div>`
            }
          } else {
            const val = Number(raw)
            if (Number.isFinite(val)) {
              rows += `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;">
                  <span style="display:flex;align-items:center;">${dot}${name}</span>
                  <strong style="margin-left:16px;">${val.toFixed(2)} m3/s</strong>
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
  /* Oculta el pequeño tooltip nativo del eje X que aparece bajo el gráfico */
  .apexcharts-xaxistooltip {
    display: none !important;
  }
</style>
