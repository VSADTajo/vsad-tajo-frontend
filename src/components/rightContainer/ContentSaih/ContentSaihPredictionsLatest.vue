<template>
  <v-card class="bg-surface" elevation="2">
    <v-card-title class="text-subtitle-1 font-weight-bold">Resumen Datos predicciones</v-card-title>
    <v-divider />
    <v-card-text v-if="loading" class="pa-4">
      <v-skeleton-loader type="heading" height="22" class="mb-2" />
      <v-skeleton-loader type="text" height="18" class="mb-2" />
      <v-skeleton-loader type="list-item-two-line" class="mb-2" />
      <v-skeleton-loader type="list-item-two-line" class="mb-2" />
      <v-skeleton-loader type="list-item-two-line" />
    </v-card-text>

    <v-card-text v-else class="pa-2">
      <template v-for="model in models" :key="model.key">
        <div class="text-caption font-weight-bold text-primary mb-1 mt-2 pl-2">
          {{ model.label }}
        </div>

        <v-row>
          <v-col cols="12" class="text-caption text-medium-emphasis pl-4">Fecha simulacion</v-col>
          <v-col cols="12" class="text-right font-weight-medium rounded px-4 pt-0">
            <v-select
              :model-value="model.selectedDate"
              :items="model.dateOptions"
              item-title="title"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
              color="primary"
              @update:model-value="(value) => model.onUpdateDate(String(value ?? ''))"
            />
          </v-col>
        </v-row>

        <template v-if="model.loading">
          <v-row>
            <v-col cols="12" class="px-4 py-1">
              <v-skeleton-loader type="list-item-two-line" />
              <v-skeleton-loader type="list-item-two-line" />
            </v-col>
          </v-row>
        </template>
        <template v-else>
          <v-row>
            <v-col cols="7" class="text-caption text-medium-emphasis pl-4">Ultimo previsto</v-col>
            <v-col cols="5" class="text-right font-weight-medium rounded pr-4">
              {{ model.lastValueLabel }}
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="5" class="text-caption text-medium-emphasis pl-4">Fecha ultimo</v-col>
            <v-col cols="7" class="text-right font-weight-medium rounded pr-4">
              {{ model.lastDateLabel }}
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="7" class="text-caption text-medium-emphasis pl-4">Maximo previsto</v-col>
            <v-col cols="5" class="text-right font-weight-medium rounded pr-4">
              {{ model.maxValueLabel }}
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="5" class="text-caption text-medium-emphasis pl-4">Fecha maximo</v-col>
            <v-col cols="7" class="text-right font-weight-medium rounded pr-4">
              {{ model.maxDateLabel }}
            </v-col>
          </v-row>
        </template>

        <v-divider class="my-1" />
      </template>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useVModel } from '@vueuse/core'
  import { formatDate, formatSimulationDate, parseDate } from '@/utils/dates'
  import type { StationPrediction } from '@/types/Predictions'

  const props = defineProps<{
    activeTab: 'caudal' | 'precipitaciones'
    loading?: boolean
    loadingHarmonie?: boolean
    loadingEps?: boolean
    caudalForecastHarmonie?: StationPrediction
    caudalForecastEpstat?: StationPrediction
    precipitationsForecastHarmonie?: StationPrediction
    precipitationsForecastEpstat?: StationPrediction
    selectedHarmonieCaudalDate?: string
    selectedHarmoniePrecipDate?: string
    selectedEpsCaudalDate?: string
    selectedEpsPrecipDate?: string
    harmonieCaudalDates?: string[]
    harmoniePrecipDates?: string[]
    epsCaudalDates?: string[]
    epsPrecipDates?: string[]
  }>()

  const emit = defineEmits<{
    (e: 'update:selectedHarmonieCaudalDate', value: string): void
    (e: 'update:selectedHarmoniePrecipDate', value: string): void
    (e: 'update:selectedEpsCaudalDate', value: string): void
    (e: 'update:selectedEpsPrecipDate', value: string): void
  }>()

  const selectedHarmonieCaudalDateModel = useVModel(props, 'selectedHarmonieCaudalDate', emit, {
    defaultValue: '',
  })

  const selectedHarmoniePrecipDateModel = useVModel(props, 'selectedHarmoniePrecipDate', emit, {
    defaultValue: '',
  })

  const selectedEpsCaudalDateModel = useVModel(props, 'selectedEpsCaudalDate', emit, {
    defaultValue: '',
  })

  const selectedEpsPrecipDateModel = useVModel(props, 'selectedEpsPrecipDate', emit, {
    defaultValue: '',
  })

  function fmtValue(value: number | undefined, unit: string): string {
    if (value == null || !Number.isFinite(value)) return '--'
    return `${value.toFixed(2)} ${unit}`
  }

  function toTimestamp(dateValue: string): number {
    return parseDate(dateValue)?.getTime() ?? Number.NEGATIVE_INFINITY
  }

  function summaryFor(prediction: StationPrediction | undefined, unit: string) {
    const results = [...(prediction?.results ?? [])].sort(
      (a, b) => toTimestamp(a.date) - toTimestamp(b.date)
    )
    const last = results.length ? results[results.length - 1] : undefined
    const max = results.length
      ? results.reduce((acc, r) => (r.value > acc.value ? r : acc), results[0])
      : undefined

    return {
      lastValueLabel: fmtValue(last?.value, unit),
      lastDateLabel: formatDate(last?.date),
      maxValueLabel: fmtValue(max?.value, unit),
      maxDateLabel: formatDate(max?.date),
    }
  }

  const unit = computed(() => (props.activeTab === 'caudal' ? 'm3/s' : 'mm'))

  const harmonieData = computed(() =>
    summaryFor(
      props.activeTab === 'caudal'
        ? props.caudalForecastHarmonie
        : props.precipitationsForecastHarmonie,
      unit.value
    )
  )

  const epstatData = computed(() =>
    summaryFor(
      props.activeTab === 'caudal'
        ? props.caudalForecastEpstat
        : props.precipitationsForecastEpstat,
      unit.value
    )
  )

  const harmonieSelectedDate = computed(() =>
    props.activeTab === 'caudal'
      ? selectedHarmonieCaudalDateModel.value
      : selectedHarmoniePrecipDateModel.value
  )

  const harmonieDateOptions = computed(() => {
    const dates =
      props.activeTab === 'caudal' ? props.harmonieCaudalDates : props.harmoniePrecipDates
    return (dates ?? []).map((date) => ({
      title: formatSimulationDate(date),
      value: date,
    }))
  })

  const epsSelectedDate = computed(() =>
    props.activeTab === 'caudal'
      ? selectedEpsCaudalDateModel.value
      : selectedEpsPrecipDateModel.value
  )

  const epsDateOptions = computed(() => {
    const dates = props.activeTab === 'caudal' ? props.epsCaudalDates : props.epsPrecipDates
    return (dates ?? []).map((date) => ({
      title: formatSimulationDate(date),
      value: date,
    }))
  })

  function updateHarmonieDate(value: string): void {
    if (props.activeTab === 'caudal') {
      selectedHarmonieCaudalDateModel.value = value
    } else {
      selectedHarmoniePrecipDateModel.value = value
    }
  }

  function updateEpsDate(value: string): void {
    if (props.activeTab === 'caudal') {
      selectedEpsCaudalDateModel.value = value
    } else {
      selectedEpsPrecipDateModel.value = value
    }
  }

  const models = computed(() => [
    {
      key: 'harmonie',
      label: 'Harmonie',
      selectedDate: harmonieSelectedDate.value,
      dateOptions: harmonieDateOptions.value,
      onUpdateDate: updateHarmonieDate,
      loading: props.loadingHarmonie ?? false,
      ...harmonieData.value,
    },
    {
      key: 'epstat',
      label: 'EPS Medio',
      selectedDate: epsSelectedDate.value,
      dateOptions: epsDateOptions.value,
      onUpdateDate: updateEpsDate,
      loading: props.loadingEps ?? false,
      ...epstatData.value,
    },
  ])
</script>
