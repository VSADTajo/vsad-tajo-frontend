<template>
  <div class="combined-chart-wrapper" :style="{ height: `${chartHeight}px` }">
    <div
      v-show="thresholdTransitionLoading || (loading && hasData)"
      class="combined-loading-overlay"
    >
      <v-skeleton-loader type="image" class="h-100 w-100" />
    </div>

    <div v-if="loading && !hasData" class="h-100 w-100">
      <v-skeleton-loader type="image" class="h-100 w-100" />
    </div>

    <apexchart
      v-if="hasData"
      :key="chartId"
      type="line"
      :height="chartHeight"
      :options="chartOptions"
      :series="series"
    />

    <div
      v-else-if="!loading"
      class="d-flex align-center justify-center text-caption text-medium-emphasis h-100"
    >
      Sin datos para mostrar
    </div>
  </div>
</template>

<script setup lang="ts">
  import ApexCharts from 'apexcharts'
  import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue'
  import type { ApexOptions } from 'apexcharts'
  import type { Point, RangePoint, SeriesItem, StationPrediction } from '@/types/Predictions'
  import { dateFormattedWithHours } from '@/utils/dates'

  type ThresholdFocusRequest = {
    action: 'focus' | 'reset'
    kind?: 'caudal' | 'volumen'
    level?: 1 | 2 | 3
    nonce: number
  }

  const props = withDefaults(
    defineProps<{
      historical?: StationPrediction
      namHarmonie?: StationPrediction
      namEps?: StationPrediction
      mikeHarmonie?: StationPrediction
      mikeEps?: StationPrediction
      thresholds?: Record<string, unknown>
      loading?: boolean
      height?: number
      focusThresholdRequest?: ThresholdFocusRequest | null
    }>(),
    {
      historical: undefined,
      namHarmonie: undefined,
      namEps: undefined,
      mikeHarmonie: undefined,
      mikeEps: undefined,
      thresholds: undefined,
      loading: false,
      height: 470,
      focusThresholdRequest: null,
    }
  )

  const emit = defineEmits<{
    (event: 'focus-threshold-complete'): void
  }>()

  const chartId = `combined-chart-${getCurrentInstance()?.uid ?? 'default'}`
  const chartHeight = computed(() => props.height)
  const thresholdTransitionLoading = ref(false)

  type NormalizedPoint = { date: string; value: number | null }

  function normalizeResults(prediction: StationPrediction | undefined): NormalizedPoint[] | null {
    if (!prediction?.results?.length) return null
    return prediction.results
      .map((r) => {
        const ts = new Date(r.date).getTime()
        if (!Number.isFinite(ts)) return null
        const v = Number(r.value)
        return { date: r.date, value: Number.isFinite(v) ? v : null }
      })
      .filter((p): p is NormalizedPoint => p !== null)
  }

  const historicalData = computed(() => normalizeResults(props.historical))
  const namHData = computed(() => normalizeResults(props.namHarmonie))
  const namEData = computed(() => normalizeResults(props.namEps))
  const mk11HData = computed(() => normalizeResults(props.mikeHarmonie))
  const mk11EData = computed(() => normalizeResults(props.mikeEps))

  const allDates = computed(() => {
    const dateSet = new Set<string>()
    historicalData.value?.forEach((d) => dateSet.add(d.date))
    namHData.value?.forEach((d) => dateSet.add(d.date))
    namEData.value?.forEach((d) => dateSet.add(d.date))
    mk11HData.value?.forEach((d) => dateSet.add(d.date))
    mk11EData.value?.forEach((d) => dateSet.add(d.date))

    const sorted = Array.from(dateSet).sort()
    if (sorted.length < 2) return sorted

    const counts = new Map<number, number>()
    for (let i = 1; i < Math.min(sorted.length, 30); i++) {
      const diff = new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()
      if (diff > 0) counts.set(diff, (counts.get(diff) ?? 0) + 1)
    }
    let step = 3_600_000
    let maxCount = 0
    for (const [diff, count] of counts) {
      if (count > maxCount) {
        maxCount = count
        step = diff
      }
    }

    const filled: string[] = []
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        const prev = new Date(sorted[i - 1]).getTime()
        const curr = new Date(sorted[i]).getTime()
        if (curr - prev > step * 1.5) {
          let t = prev + step
          while (t < curr) {
            filled.push(new Date(t).toISOString())
            t += step
          }
        }
      }
      filled.push(sorted[i])
    }
    return filled
  })

  const xLabels = computed(() =>
    allDates.value.map((date) => dateFormattedWithHours(new Date(date).getTime()))
  )

  const t0Label = computed(() => {
    if (allDates.value.length === 0) return null
    const now = Date.now()
    let closestIndex = 0
    let minDiff = Math.abs(new Date(allDates.value[0]).getTime() - now)
    for (let i = 1; i < allDates.value.length; i++) {
      const diff = Math.abs(new Date(allDates.value[i]).getTime() - now)
      if (diff < minDiff) {
        minDiff = diff
        closestIndex = i
      }
    }
    return xLabels.value[closestIndex] ?? null
  })

  function hasFiniteValue(points: Array<{ y: number | null }>): boolean {
    return points.some((p) => Number.isFinite(p.y))
  }

  function buildSeries(
    data: NormalizedPoint[] | null,
    name: string
  ): { name: string; type: string; data: { x: string; y: number | null }[] } | null {
    if (!data) return null
    const dataMap = new Map(data.map((d) => [d.date, d.value]))
    const labels = xLabels.value
    const points = allDates.value.map((date, i) => {
      const v = dataMap.get(date) ?? null
      return { x: labels[i], y: v }
    })
    if (!hasFiniteValue(points)) return null
    return { name, type: 'line', data: points }
  }

  const series = computed(() => {
    const result: { name: string; type: string; data: { x: string; y: number | null }[] }[] = []
    const s1 = buildSeries(historicalData.value, 'Observado')
    if (s1) result.push(s1)
    const s2 = buildSeries(namHData.value, 'NAM Harmonie')
    if (s2) result.push(s2)
    const s3 = buildSeries(namEData.value, 'NAM EPS Medio')
    if (s3) result.push(s3)
    const s4 = buildSeries(mk11HData.value, 'MIKE Harmonie')
    if (s4) result.push(s4)
    const s5 = buildSeries(mk11EData.value, 'MIKE EPS Medio')
    if (s5) result.push(s5)
    return result
  })

  const hasData = computed(() => series.value.length > 0)

  function readNumber(keys: string[], source?: Record<string, unknown>): number | null {
    if (!source) return null
    for (const key of keys) {
      const raw = source[key]
      if (raw == null) continue
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw
      if (typeof raw === 'string') {
        const parsed = Number.parseFloat(raw.replace(',', '.'))
        if (Number.isFinite(parsed)) return parsed
      }
    }
    return null
  }

  const thresholdAnnotations = computed(() => {
    const t1 = readNumber(['umbral_caudal_1', 'umbral_cauda_1'], props.thresholds)
    const t2 = readNumber(['umbral_caudal_2', 'umbral_cauda_2'], props.thresholds)
    const t3 = readNumber(['umbral_caudal_3', 'umbral_cauda_3'], props.thresholds)
    const result: NonNullable<NonNullable<ApexOptions['annotations']>['yaxis']> = []
    if (t1 != null) result.push({ y: t1, borderColor: '#fde68a', borderWidth: 2 })
    if (t2 != null) result.push({ y: t2, borderColor: '#fdba74', borderWidth: 2 })
    if (t3 != null) result.push({ y: t3, borderColor: '#fca5a5', borderWidth: 2 })
    return result
  })

  const t0Annotation = computed(() => {
    if (!t0Label.value) return []
    return [
      {
        x: t0Label.value,
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

  const SERIES_COLORS: Record<string, string> = {
    Observado: '#2E7D32',
    'NAM Harmonie': '#1565C0',
    'NAM EPS Medio': '#64B5F6',
    'MIKE Harmonie': '#E65100',
    'MIKE EPS Medio': '#FFB74D',
  }

  const dynamicColors = computed(() => series.value.map((s) => SERIES_COLORS[s.name] ?? '#999'))

  const dynamicDash = computed(() =>
    series.value.map((s) => (s.name === 'NAM EPS Medio' || s.name === 'MIKE EPS Medio' ? 5 : 0))
  )

  const baseYAxis = {
    min: 0,
    labels: { formatter: (v: number) => Number(v).toFixed(2) },
    title: { text: 'm³/s' },
  }

  function tooltipCustom({
    dataPointIndex,
    w,
  }: {
    dataPointIndex: number
    w: { config?: { series?: SeriesItem[] }; globals?: { colors?: string[] } }
  }): string {
    const cfgSeries = (w.config?.series ?? []) as SeriesItem[]
    let dateFormatted = ''
    for (let si = 0; si < cfgSeries.length; si++) {
      const pt = cfgSeries[si]?.data?.[dataPointIndex]
      if (pt && typeof pt === 'object' && 'x' in pt) {
        const candidate = (pt as { x?: unknown }).x
        if (candidate !== undefined && candidate !== null) {
          dateFormatted = String(candidate)
          break
        }
      }
    }
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
      const val = Number(raw)
      if (Number.isFinite(val)) {
        rows += `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;"><span style="display:flex;align-items:center;">${dot}${name}</span><strong style="margin-left:16px;">${val.toFixed(2)} m3/s</strong></div>`
      }
    })

    return `<div style="min-width:280px;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.15);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;"><div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:10px 14px;font-weight:600;">${dateFormatted}</div><div style="background:#fff;color:#333;padding:8px 14px;">${rows || '<div style="padding:4px 0;color:#999;">Sin datos</div>'}</div></div>`
  }

  const chartOptions = computed<ApexOptions>(() => ({
    chart: {
      id: chartId,
      type: 'line',
      animations: { enabled: false, dynamicAnimation: { enabled: false, speed: 0 } },
      zoom: { enabled: true, type: 'x', autoScaleYaxis: true, allowMouseWheelZoom: false },
      toolbar: {
        show: true,
        tools: { download: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true },
      },
    },
    colors: dynamicColors.value,
    stroke: { width: 2, curve: 'smooth', dashArray: dynamicDash.value },
    dataLabels: { enabled: false },
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
    yaxis: baseYAxis,
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      followCursor: true,
      x: { show: false },
      fixed: { enabled: false },
      onDatasetHover: { highlightDataSeries: false },
      custom: tooltipCustom,
    },
    annotations: {
      xaxis: t0Annotation.value,
      yaxis: thresholdAnnotations.value,
    },
    legend: { position: 'bottom', horizontalAlign: 'center' },
  }))

  function getThresholdValue(level: 1 | 2 | 3): number | null {
    if (level === 1)
      return readNumber(['umbral_caudal_1', 'umbral_cauda_1', 'umbralCaudal1'], props.thresholds)
    if (level === 2)
      return readNumber(['umbral_caudal_2', 'umbral_cauda_2', 'umbralCaudal2'], props.thresholds)
    return readNumber(['umbral_caudal_3', 'umbral_cauda_3', 'umbralCaudal3'], props.thresholds)
  }

  function getFocusedRange(value: number): { min: number; max: number } {
    const safeValue = Math.max(0, value)
    const max = Math.max(safeValue * 2, safeValue * 1.25, 1)
    return { min: 0, max }
  }

  async function focusChartAtThreshold(request: ThresholdFocusRequest | null): Promise<void> {
    if (!request) return
    thresholdTransitionLoading.value = true
    try {
      await nextTick()
      await new Promise<void>((resolve) => setTimeout(resolve, 50))
      const noAnim = {
        chart: { animations: { enabled: false, dynamicAnimation: { enabled: false, speed: 0 } } },
      }
      if (request.action === 'reset') {
        await ApexCharts.exec(
          chartId,
          'updateOptions',
          { yaxis: baseYAxis, ...noAnim },
          false,
          false
        )
        return
      }
      if (!request.level) return
      const target = getThresholdValue(request.level)
      if (target == null || !Number.isFinite(target)) return
      const focusedRange = getFocusedRange(target)
      await ApexCharts.exec(
        chartId,
        'updateOptions',
        { yaxis: { ...baseYAxis, ...focusedRange }, ...noAnim },
        false,
        false
      )
    } finally {
      thresholdTransitionLoading.value = false
      emit('focus-threshold-complete')
    }
  }

  watch(
    () => props.focusThresholdRequest?.nonce,
    () => {
      void focusChartAtThreshold(props.focusThresholdRequest ?? null)
    }
  )
</script>

<style scoped>
  .combined-chart-wrapper {
    position: relative;
    width: 100%;
  }

  .combined-loading-overlay {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: all;
  }
</style>
