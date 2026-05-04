<template>
  <v-card class="bg-surface" elevation="2">
    <v-card-title class="text-subtitle-1 font-weight-bold">Resumen datos observados</v-card-title>
    <v-divider />
    <v-card-text v-if="loading" class="pa-4">
      <v-skeleton-loader type="heading" height="22" class="mb-2" />
      <v-skeleton-loader type="text" height="18" class="mb-2" />
      <v-skeleton-loader type="list-item-two-line" class="mb-2" />
      <v-skeleton-loader type="list-item-two-line" class="mb-2" />
      <v-skeleton-loader type="list-item-two-line" />
    </v-card-text>

    <v-card-text v-else>
      <v-row>
        <v-col cols="12" class="text-caption text-medium-emphasis">Fecha simulacion</v-col>
        <v-col cols="12" class="text-right font-weight-medium pt-0">
          <v-select
            v-model="activeObservedDate"
            :items="formattedObservedDates"
            item-title="title"
            item-value="value"
            variant="outlined"
            density="compact"
            hide-details
            color="primary"
          />
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="7" class="text-caption text-medium-emphasis">Último Observado</v-col>
        <v-col cols="5" class="text-right font-weight-medium rounded px-2" :class="lastValueClass">
          {{ lastObservedValueLabel }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="5" class="text-caption text-medium-emphasis">Fecha Último</v-col>
        <v-col cols="7" class="text-right font-weight-medium">
          {{ lastObservedDateLabel }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="7" class="text-caption text-medium-emphasis">Máximo Observado</v-col>
        <v-col cols="5" class="text-right font-weight-medium rounded px-2" :class="maxValueClass">
          {{ maxObservedValueLabel }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="5" class="text-caption text-medium-emphasis">Fecha Máximo</v-col>
        <v-col cols="7" class="text-right font-weight-medium">
          {{ maxObservedDateLabel }}
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useVModel } from '@vueuse/core'
  import { formatDate, formatSimulationDate, toTimestamp } from '@/utils/dates'
  import type { StationPrediction } from '@/types/Predictions'

  const props = defineProps<{
    activeTab: 'caudal' | 'precipitaciones'
    loading?: boolean
    selectedObservedCaudalDate?: string
    selectedObservedPrecipDate?: string
    observedCaudalDates?: string[]
    observedPrecipDates?: string[]
    caudalHistorical?: StationPrediction
    precipitationsHistorical?: StationPrediction
    thresholds?: Record<string, unknown>
  }>()

  const emit = defineEmits<{
    (e: 'update:selectedObservedCaudalDate', value: string): void
    (e: 'update:selectedObservedPrecipDate', value: string): void
  }>()

  const selectedObservedCaudalDateModel = useVModel(props, 'selectedObservedCaudalDate', emit, {
    defaultValue: '',
  })

  const selectedObservedPrecipDateModel = useVModel(props, 'selectedObservedPrecipDate', emit, {
    defaultValue: '',
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

  function formatValue(value: number | undefined, unit: string): string {
    if (value == null || !Number.isFinite(value)) return '--'
    return `${value.toFixed(2)} ${unit}`
  }

  const activeHistorical = computed(() =>
    props.activeTab === 'caudal' ? props.caudalHistorical : props.precipitationsHistorical
  )

  const orderedResults = computed(() =>
    [...(activeHistorical.value?.results ?? [])].sort(
      (a, b) => toTimestamp(a.date) - toTimestamp(b.date)
    )
  )

  const lastObserved = computed(() => {
    const values = orderedResults.value
    return values.length ? values[values.length - 1] : undefined
  })

  const maxObserved = computed(() => {
    const values = orderedResults.value
    if (!values.length) return undefined

    return values.reduce((acc, item) => (item.value > acc.value ? item : acc), values[0])
  })

  const unitLabel = computed(() => (props.activeTab === 'caudal' ? 'm3/s' : 'mm'))

  const activeObservedDates = computed(() =>
    props.activeTab === 'caudal'
      ? (props.observedCaudalDates ?? [])
      : (props.observedPrecipDates ?? [])
  )

  const activeObservedDate = computed({
    get: () =>
      props.activeTab === 'caudal'
        ? selectedObservedCaudalDateModel.value
        : selectedObservedPrecipDateModel.value,
    set: (value: string) => {
      if (props.activeTab === 'caudal') {
        selectedObservedCaudalDateModel.value = value
      } else {
        selectedObservedPrecipDateModel.value = value
      }
    },
  })

  const formattedObservedDates = computed(() =>
    activeObservedDates.value.map((date) => ({
      title: formatSimulationDate(date),
      value: date,
    }))
  )

  const lastObservedValueLabel = computed(() =>
    formatValue(lastObserved.value?.value, unitLabel.value)
  )
  const maxObservedValueLabel = computed(() =>
    formatValue(maxObserved.value?.value, unitLabel.value)
  )
  const lastObservedDateLabel = computed(() => formatDate(lastObserved.value?.date))
  const maxObservedDateLabel = computed(() => formatDate(maxObserved.value?.date))

  const yellowThreshold = computed(() =>
    readNumber(['umbral_cauda_1', 'umbral_caudal_1', 'threshold_yellow'], props.thresholds)
  )

  const orangeThreshold = computed(() =>
    readNumber(['umbral_cauda_2', 'umbral_caudal_2', 'threshold_orange'], props.thresholds)
  )

  const redThreshold = computed(() =>
    readNumber(['umbral_cauda_3', 'umbral_caudal_3', 'threshold_red'], props.thresholds)
  )

  function getThresholdClass(value: number | undefined): string {
    if (props.activeTab !== 'caudal' || value == null || !Number.isFinite(value)) return ''

    if (redThreshold.value != null && value >= redThreshold.value) return 'threshold-red'
    if (orangeThreshold.value != null && value >= orangeThreshold.value) return 'threshold-orange'
    if (yellowThreshold.value != null && value >= yellowThreshold.value) return 'threshold-yellow'

    return ''
  }

  const lastValueClass = computed(() => getThresholdClass(lastObserved.value?.value))
  const maxValueClass = computed(() => getThresholdClass(maxObserved.value?.value))
</script>

<style scoped>
  .threshold-yellow {
    background: #fde68a;
    color: #7c2d12;
  }

  .threshold-orange {
    background: #fdba74;
    color: #7c2d12;
  }

  .threshold-red {
    background: #fca5a5;
    color: #7f1d1d;
  }
</style>
