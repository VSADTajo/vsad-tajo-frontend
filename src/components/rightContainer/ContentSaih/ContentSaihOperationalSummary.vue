<template>
  <v-card class="bg-surface operational-summary-card" elevation="2">
    <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center ga-2">
      {{ title }}
    </v-card-title>
    <v-divider />

    <v-card-text class="pa-2 d-flex flex-column flex-grow-1">
      <v-card class="bg-surface w-100 h-100" elevation="0">
        <v-card-text v-if="loading" class="pa-4">
          <v-skeleton-loader type="list-item-two-line" class="mb-2" />
          <v-skeleton-loader type="list-item-two-line" class="mb-2" />
          <v-skeleton-loader type="list-item-two-line" class="mb-2" />
          <v-skeleton-loader type="list-item-two-line" />
        </v-card-text>

        <v-card-text v-else class="pa-4 operational-summary-content d-flex flex-column">
          <template v-if="hasObservedData">
            <div
              v-for="item in summaryItems"
              :key="item.id"
              class="d-flex align-start ga-3 operational-summary-item"
            >
              <span class="summary-dot" :class="`summary-dot--${item.level}`" />
              <span class="text-body-2">{{ item.text }}</span>
            </div>
          </template>

          <div v-else class="observed-empty-state text-medium-emphasis">
            No se han encontrado datos observados
          </div>
        </v-card-text>
      </v-card>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { formatDate, toTimestamp } from '@/utils/dates'
  import type { PredictionResult, StationPrediction } from '@/types/Predictions'

  type SummaryLevel = 'info' | 'yellow' | 'orange' | 'red'

  type SummaryItem = {
    id: string
    level: SummaryLevel
    text: string
  }

  type ThresholdLevel = 0 | 1 | 2 | 3

  type Segment = {
    level: Exclude<ThresholdLevel, 0>
    startDate: string
    endDate: string
    count: number
  }

  const props = defineProps<{
    loading?: boolean
    caudalHistorical?: StationPrediction
    thresholds?: Record<string, unknown>
    title: string
  }>()

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

  const threshold1 = computed(() => readNumber(['umbral_caudal_1'], props.thresholds))

  const threshold2 = computed(() => readNumber(['umbral_caudal_2'], props.thresholds))

  const threshold3 = computed(() => readNumber(['umbral_caudal_3'], props.thresholds))

  const orderedObserved = computed(() => {
    return [...(props.caudalHistorical?.results ?? [])]
      .filter((item) => Number.isFinite(item.value) && Boolean(item.date))
      .sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date))
  })

  function getExceededLevel(value: number): ThresholdLevel {
    if (threshold3.value != null && value >= threshold3.value) return 3
    if (threshold2.value != null && value >= threshold2.value) return 2
    if (threshold1.value != null && value >= threshold1.value) return 1
    return 0
  }

  function buildSegments(series: PredictionResult[]): Segment[] {
    const segments: Segment[] = []
    let current: Segment | null = null

    for (const point of series) {
      const exceeded = getExceededLevel(point.value)

      if (!exceeded) {
        current = null
        continue
      }

      if (current && current.level === exceeded) {
        current.endDate = point.date
        current.count += 1
        continue
      }

      current = {
        level: exceeded,
        startDate: point.date,
        endDate: point.date,
        count: 1,
      }

      segments.push(current)
    }

    return segments
  }

  const hasObservedData = computed(() => orderedObserved.value.length > 0)

  const summaryItems = computed<SummaryItem[]>(() => {
    const observed = orderedObserved.value

    if (!observed.length) {
      return []
    }

    const latest = observed[observed.length - 1]
    const maxObserved = observed.reduce(
      (acc, item) => (item.value > acc.value ? item : acc),
      observed[0]
    )

    const items: SummaryItem[] = [
      {
        id: 'latest',
        level: 'info',
        text: `Ultimo observado: ${latest.value.toFixed(2)} m3/s (${formatDate(latest.date)})`,
      },
      {
        id: 'max',
        level: 'info',
        text: `Maximo observado: ${maxObserved.value.toFixed(2)} m3/s (${formatDate(maxObserved.date)})`,
      },
    ]

    const segments = buildSegments(observed)
    const byLevel = {
      1: segments.filter((item) => item.level === 1),
      2: segments.filter((item) => item.level === 2),
      3: segments.filter((item) => item.level === 3),
    }

    const labels: Record<1 | 2 | 3, string> = {
      1: 'Nivel 1',
      2: 'Nivel 2',
      3: 'Nivel 3',
    }

    const levelColor: Record<1 | 2 | 3, SummaryLevel> = {
      1: 'yellow',
      2: 'orange',
      3: 'red',
    }

    ;([3, 2, 1] as const).forEach((level) => {
      const levelSegments = byLevel[level]
      if (!levelSegments.length) return

      const latestSegment = levelSegments[levelSegments.length - 1]
      const intervalLabel =
        latestSegment.startDate === latestSegment.endDate
          ? formatDate(latestSegment.startDate)
          : `${formatDate(latestSegment.startDate)} - ${formatDate(latestSegment.endDate)}`

      items.push({
        id: `level-${level}`,
        level: levelColor[level],
        text: `${labels[level]} superado en ${levelSegments.length} intervalo(s). Ultimo: ${intervalLabel}`,
      })
    })

    if (!segments.length) {
      items.push({
        id: 'no-thresholds',
        level: 'info',
        text: 'Sin superaciones de umbral en el periodo observado',
      })
    }

    return items
  })
</script>

<style scoped>
  .operational-summary-card {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .operational-summary-content {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
  }

  .observed-empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-weight: 500;
  }

  .operational-summary-item {
    line-height: 1.35;
  }

  .summary-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    margin-top: 6px;
    flex: 0 0 auto;
  }

  .summary-dot--info {
    background: #1e88e5;
  }

  .summary-dot--yellow {
    background: #fde68a;
  }

  .summary-dot--orange {
    background: #fdba74;
  }

  .summary-dot--red {
    background: #fca5a5;
  }
</style>
