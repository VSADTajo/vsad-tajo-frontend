<template>
  <v-card class="bg-surface" elevation="2">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2 py-3 px-4">
      <div class="text-subtitle-1 font-weight-bold">Matriz de caudales (7 dias / 6h)</div>

      <v-btn-toggle
        v-model="valueMode"
        mandatory
        density="compact"
        color="primary"
        variant="outlined"
      >
        <v-btn value="minimo" size="small">Minimo</v-btn>
        <v-btn value="medio" size="small">Medio</v-btn>
        <v-btn value="maximo" size="small">Maximo</v-btn>
      </v-btn-toggle>
    </v-card-title>

    <v-divider />

    <v-card-text>
      <div v-if="loading" class="py-4">
        <v-skeleton-loader type="table" />
      </div>

      <div v-else-if="!rows.length || !timeColumns.length" class="text-medium-emphasis py-3">
        No hay datos de caudal para mostrar la tabla.
      </div>

      <div v-else class="matrix-scroll">
        <table class="caudal-matrix">
          <thead>
            <tr>
              <th class="model-col sticky-col bg-surface">Modelo</th>
              <th v-for="col in timeColumns" :key="col" class="time-col bg-surface">
                {{ formatHeader(col) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td class="sticky-col model-col">
                {{ row.label }}
              </td>
              <td
                v-for="col in timeColumns"
                :key="`${row.id}-${col}`"
                class="value-col"
                :class="cellClass(selectValue(row.valuesByDate.get(col)))"
              >
                {{ formatValue(selectValue(row.valuesByDate.get(col))) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { StationPrediction } from '@/types/Predictions'
  import { format } from 'date-fns'

  type ValueMode = 'minimo' | 'medio' | 'maximo'

  const props = defineProps<{
    forecastHarmonie?: StationPrediction
    forecastEpsat?: StationPrediction
    thresholds?: Record<string, unknown>
    loading?: boolean
  }>()

  const valueMode = ref<ValueMode>('medio')

  type RowDefinition = {
    id: string
    label: string
    prediction?: StationPrediction
  }

  type RawResult = Record<string, unknown>

  const rowDefinitions = computed<RowDefinition[]>(() => [
    { id: 'harmonie', label: 'Harmonie', prediction: props.forecastHarmonie },
    { id: 'eps', label: 'EPS medio', prediction: props.forecastEpsat },
  ])

  function toValuesByDate(prediction?: StationPrediction): Map<string, RawResult> {
    const map = new Map<string, RawResult>()
    prediction?.results?.forEach((item) => {
      map.set(item.date, item as unknown as RawResult)
    })
    return map
  }

  const rows = computed(() =>
    rowDefinitions.value
      .map((row) => ({
        ...row,
        valuesByDate: toValuesByDate(row.prediction),
      }))
      .filter((row) => row.valuesByDate.size > 0)
  )

  const allDates = computed(() => {
    const set = new Set<string>()
    rows.value.forEach((row) => {
      row.valuesByDate.forEach((_, date) => set.add(date))
    })

    return Array.from(set).sort()
  })

  function isSixHourSlot(dateIso: string, index: number): boolean {
    const date = new Date(dateIso)
    if (Number.isNaN(date.getTime())) {
      return index % 6 === 0
    }

    return date.getHours() % 6 === 0 && date.getMinutes() === 0
  }

  const timeColumns = computed(() => {
    const filtered = allDates.value.filter((date, index) => isSixHourSlot(date, index))

    return filtered.slice(0, 28)
  })

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

  function selectValue(raw?: RawResult): number | null {
    if (!raw) return null

    if (valueMode.value === 'minimo') {
      return readNumber(['min', 'minimum', 'value_min', 'minimo', 'qmin', 'value'], raw)
    }

    if (valueMode.value === 'maximo') {
      return readNumber(['max', 'maximum', 'value_max', 'maximo', 'qmax', 'value'], raw)
    }

    return readNumber(['mean', 'avg', 'media', 'value_mean', 'qmed', 'value'], raw)
  }

  const yellowThreshold = computed(
    () => readNumber(['umbral_amarillo', 'threshold_yellow'], props.thresholds) ?? 40
  )

  const orangeThreshold = computed(
    () => readNumber(['umbral_naranja', 'threshold_orange'], props.thresholds) ?? 70
  )

  const redThreshold = computed(
    () => readNumber(['umbral_rojo', 'threshold_red'], props.thresholds) ?? 90
  )

  function cellClass(value: number | null): string {
    if (value == null) return 'cell-empty'

    if (value >= redThreshold.value) return 'cell-red'
    if (value >= orangeThreshold.value) return 'cell-orange'
    if (value >= yellowThreshold.value) return 'cell-yellow'

    return 'cell-normal'
  }

  function formatHeader(dateIso: string): string {
    const date = new Date(dateIso)
    if (Number.isNaN(date.getTime())) return dateIso

    return format(date, 'dd/MM HH')
  }

  function formatValue(value: number | null): string {
    if (value == null) return '--'
    return Number.isInteger(value) ? String(value) : value.toFixed(1)
  }
</script>

<style scoped>
  .matrix-scroll {
    overflow-x: auto;
    overflow-y: hidden;
  }

  .caudal-matrix {
    border-collapse: separate;
    border-spacing: 0;
    width: max-content;
    min-width: 100%;
    font-size: 0.75rem;
  }

  .caudal-matrix th,
  .caudal-matrix td {
    border: 1px solid rgba(0, 0, 0, 0.08);
    text-align: center;
    padding: 4px 6px;
    white-space: nowrap;
    height: 30px;
  }

  .caudal-matrix thead th {
    background: rgb(var(--v-theme-surface-variant));
    font-weight: 700;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .model-col {
    min-width: 118px;
    max-width: 118px;
    font-weight: 700;
    text-align: left !important;
    padding-left: 8px !important;
  }

  .time-col,
  .value-col {
    width: 75px;
    min-width: 75px;
    max-width: 75px;
  }

  .sticky-col {
    position: sticky !important;
    left: 0;
    z-index: 3;
    background: rgb(var(--v-theme-surface));
  }

  .cell-empty {
    color: rgba(0, 0, 0, 0.35);
  }

  .cell-normal {
    background: rgba(148, 163, 184, 0.12);
  }

  .cell-yellow {
    background: #fde68a;
    color: #7c2d12;
    font-weight: 700;
  }

  .cell-orange {
    background: #fdba74;
    color: #7c2d12;
    font-weight: 700;
  }

  .cell-red {
    background: #f87171;
    color: #7f1d1d;
    font-weight: 700;
  }
</style>
