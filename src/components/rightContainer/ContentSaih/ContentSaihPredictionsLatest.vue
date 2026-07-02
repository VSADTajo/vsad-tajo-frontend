<template>
  <v-card class="bg-surface" elevation="2">
    <v-tooltip text="Resumen Datos Predicciones" location="end">
      <template #activator="{ props: tooltipProps }">
        <v-card-title v-bind="tooltipProps" class="text-body-2 font-weight-bold text-truncate">
          Resumen Datos Predicciones
        </v-card-title>
      </template>
    </v-tooltip>

    <v-divider />

    <v-card-text v-if="loading" class="pa-4">
      <v-skeleton-loader type="heading" height="22" class="mb-2" />

      <v-skeleton-loader type="text" height="18" class="mb-2" />

      <v-skeleton-loader type="list-item-two-line" class="mb-2" />

      <v-skeleton-loader type="list-item-two-line" class="mb-2" />

      <v-skeleton-loader type="list-item-two-line" />
    </v-card-text>

    <v-card-text v-else class="pa-2">
      <div v-if="mikeHarmonieForecast" class="mb-2 d-flex justify-center">
        <v-btn-toggle v-model="selectedSource" mandatory density="compact">
          <v-btn value="nam" size="x-small">NAM</v-btn>
          <v-btn value="mike" size="x-small">MIKE</v-btn>
        </v-btn-toggle>
      </div>

      <div class="mb-3 d-flex justify-center">
        <v-btn-toggle
          v-model="selectedModel"
          mandatory
          density="compact"
          divided
          variant="outlined"
        >
          <v-btn value="harmonie" size="x-small">Harmonie</v-btn>

          <v-btn value="eps" size="x-small">EPS Medio</v-btn>
        </v-btn-toggle>
      </div>

      <div v-if="selectedModel === 'harmonie'">
        <div class="text-caption font-weight-bold text-primary mb-1 mt-2 pl-2">Harmonie</div>

        <v-row>
          <v-col cols="12" class="text-caption text-medium-emphasis pl-4">Fecha simulacion</v-col>

          <v-col cols="12" class="text-right font-weight-medium rounded px-4 pt-0">
            <v-select
              :model-value="harmonieSelectedDate"
              :items="harmonieDateOptions"
              item-title="title"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
              color="primary"
              @update:model-value="setHarmonieDate"
            />
          </v-col>
        </v-row>

        <template v-if="loadingHarmonie">
          <v-row>
            <v-col cols="12" class="px-4 py-1">
              <v-skeleton-loader type="list-item-two-line" />

              <v-skeleton-loader type="list-item-two-line" />
            </v-col>
          </v-row>
        </template>

        <template v-else>
          <v-row>
            <v-col cols="6" class="text-caption text-medium-emphasis pl-4">Ultimo previsto</v-col>

            <v-col cols="6" class="text-right font-weight-medium pr-4">
              <v-chip
                :color="getThresholdClass(harmonieData.lastValue)"
                size="small"
                variant="flat"
                style="max-width: 100%"
              >
                {{ harmonieData.lastValueLabel }}
              </v-chip>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="5" class="text-caption text-medium-emphasis pl-4">Fecha ultimo</v-col>

            <v-col cols="7" class="text-right font-weight-medium rounded pr-4">
              {{ harmonieData.lastDateLabel }}
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="6" class="text-caption text-medium-emphasis pl-4">Maximo previsto</v-col>

            <v-col cols="6" class="text-right font-weight-medium pr-4">
              <v-chip
                :color="getThresholdClass(harmonieData.maxValue)"
                size="small"
                variant="flat"
                style="max-width: 100%"
              >
                {{ harmonieData.maxValueLabel }}
              </v-chip>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="5" class="text-caption text-medium-emphasis pl-4">Fecha maximo</v-col>

            <v-col cols="7" class="text-right font-weight-medium rounded pr-4">
              {{ harmonieData.maxDateLabel }}
            </v-col>
          </v-row>

          <v-row v-if="harmonieAccumMm !== null">
            <v-col cols="6" class="text-caption text-medium-emphasis pl-4">Acumulado 3 días</v-col>

            <v-col cols="6" class="text-right font-weight-medium pr-4">
              <v-chip size="small" :color="harmonieAlertColor" variant="tonal">
                {{ harmonieAccumMm.toFixed(1) }} mm
              </v-chip>
            </v-col>
          </v-row>
        </template>
      </div>

      <div v-else>
        <div class="text-caption font-weight-bold text-primary mb-1 mt-2 pl-2">EPS Medio</div>

        <v-row>
          <v-col cols="12" class="text-caption text-medium-emphasis pl-4">Fecha simulacion</v-col>

          <v-col cols="12" class="text-right font-weight-medium rounded px-4 pt-0">
            <v-select
              :model-value="epsSelectedDate"
              :items="epsDateOptions"
              item-title="title"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
              color="primary"
              @update:model-value="setEpsDate"
            />
          </v-col>
        </v-row>

        <template v-if="loadingEps">
          <v-row>
            <v-col cols="12" class="px-4 py-1">
              <v-skeleton-loader type="list-item-two-line" />

              <v-skeleton-loader type="list-item-two-line" />
            </v-col>
          </v-row>
        </template>

        <template v-else>
          <v-row>
            <v-col cols="6" class="text-caption text-medium-emphasis pl-4">Ultimo previsto</v-col>

            <v-col cols="6" class="text-right font-weight-medium pr-4">
              <v-chip
                :color="getThresholdClass(epstatData.lastValue)"
                size="small"
                variant="flat"
                style="max-width: 100%"
              >
                {{ epstatData.lastValueLabel }}
              </v-chip>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="5" class="text-caption text-medium-emphasis pl-4">Fecha ultimo</v-col>

            <v-col cols="7" class="text-right font-weight-medium rounded pr-4">
              {{ epstatData.lastDateLabel }}
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="6" class="text-caption text-medium-emphasis pl-4">Maximo previsto</v-col>

            <v-col cols="6" class="text-right font-weight-medium pr-4">
              <v-chip
                :color="getThresholdClass(epstatData.maxValue)"
                size="small"
                variant="flat"
                style="max-width: 100%"
              >
                {{ epstatData.maxValueLabel }}
              </v-chip>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="5" class="text-caption text-medium-emphasis pl-4">Fecha maximo</v-col>

            <v-col cols="7" class="text-right font-weight-medium rounded pr-4">
              {{ epstatData.maxDateLabel }}
            </v-col>
          </v-row>

          <v-row v-if="epsAccumMm !== null">
            <v-col cols="6" class="text-caption text-medium-emphasis pl-4">Acumulado 6 días</v-col>

            <v-col cols="6" class="text-right font-weight-medium pr-4">
              <v-chip size="small" :color="epsAlertColor" variant="tonal">
                {{ epsAccumMm.toFixed(1) }} mm
              </v-chip>
            </v-col>
          </v-row>
        </template>
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue'

  import { useVModel } from '@vueuse/core'

  import { formatDate, formatSimulationDate, parseDate } from '@/utils/dates'

  import type { StationPrediction } from '@/types/Predictions'

  import {
    extractAccumulatedHorizonValuesWithMode,
    PRECIP_HORIZON_META,
  } from '../utils/precipAccumulation'
  import {
    DEFAULT_PRECIP_THRESHOLDS_GRAVE,
    DEFAULT_PRECIP_THRESHOLDS_LEVE,
    DEFAULT_PRECIP_THRESHOLDS_MEDIO,
  } from '../utils/precipThresholds'

  const props = defineProps<{
    activeTab?: 'caudal' | 'volumen' | 'precipitaciones'

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

    mikeHarmonieForecast?: StationPrediction

    mikeEpsatForecast?: StationPrediction

    mikeHarmonieDates?: string[]

    selectedMikeHarmonieDate?: string

    thresholds?: Record<string, unknown>
  }>()

  const emit = defineEmits<{
    (e: 'update:selectedHarmonieCaudalDate', value: string): void

    (e: 'update:selectedHarmoniePrecipDate', value: string): void

    (e: 'update:selectedEpsCaudalDate', value: string): void

    (e: 'update:selectedEpsPrecipDate', value: string): void

    (e: 'update:selectedMikeHarmonieDate', value: string): void
  }>()

  const selectedModel = ref<'harmonie' | 'eps'>('harmonie')
  const selectedSource = ref<'nam' | 'mike'>('nam')

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

  const selectedMikeHarmonieDateModel = useVModel(props, 'selectedMikeHarmonieDate', emit, {
    defaultValue: '',
  })

  function fmtValue(value: number | undefined, unit: string): string {
    if (value == null || !Number.isFinite(value)) return '--'

    return `${value.toFixed(2)} ${unit}`
  }

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

    if (redThreshold.value != null && value >= redThreshold.value) return 'red-lighten-3'

    if (orangeThreshold.value != null && value >= orangeThreshold.value) return 'orange-lighten-3'

    if (yellowThreshold.value != null && value >= yellowThreshold.value) return 'amber-lighten-3'

    return ''
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
      lastValue: last?.value,

      lastValueLabel: fmtValue(last?.value, unit),

      lastDateLabel: formatDate(last?.date),

      maxValue: max?.value,

      maxValueLabel: fmtValue(max?.value, unit),

      maxDateLabel: formatDate(max?.date),
    }
  }

  const unit = computed(() => {
    if (props.activeTab === 'volumen') return 'hm3'

    if (props.activeTab !== 'precipitaciones') return 'm3/s'

    return 'mm'
  })

  const harmonieData = computed(() => {
    if (props.activeTab === 'precipitaciones') {
      return summaryFor(props.precipitationsForecastHarmonie, unit.value)
    }
    const forecast =
      selectedSource.value === 'mike' ? props.mikeHarmonieForecast : props.caudalForecastHarmonie
    return summaryFor(forecast, unit.value)
  })

  const epstatData = computed(() => {
    if (props.activeTab === 'precipitaciones') {
      return summaryFor(props.precipitationsForecastEpstat, unit.value)
    }
    const forecast =
      selectedSource.value === 'mike' ? props.mikeEpsatForecast : props.caudalForecastEpstat
    return summaryFor(forecast, unit.value)
  })

  function sumPredictionHours(
    prediction: StationPrediction | undefined,
    maxHours: number
  ): number | null {
    const results = prediction?.results
    if (!results?.length) return null
    const sorted = results
      .map((r) => ({ ts: new Date(r.date).getTime(), v: Number(r.value) }))
      .filter((r) => Number.isFinite(r.ts) && Number.isFinite(r.v))
      .sort((a, b) => a.ts - b.ts)
    if (!sorted.length) return null
    const cutoff = sorted[0].ts + maxHours * 60 * 60 * 1000
    const vals = sorted.filter((r) => r.ts <= cutoff).map((r) => r.v)
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null
  }

  function getPrecipAlertColor(prediction: StationPrediction | undefined): string {
    const values = extractAccumulatedHorizonValuesWithMode(prediction, 'forward')
    let worst: 0 | 1 | 2 | 3 = 0
    for (const h of PRECIP_HORIZON_META) {
      if (h.hours === 0) continue
      const val = values[h.key]
      if (val === null || !Number.isFinite(val)) continue
      const grave = DEFAULT_PRECIP_THRESHOLDS_GRAVE[h.key]
      const medio = DEFAULT_PRECIP_THRESHOLDS_MEDIO[h.key]
      const leve = DEFAULT_PRECIP_THRESHOLDS_LEVE[h.key]
      if (grave !== null && val >= grave) {
        worst = 3
        break
      }
      if (medio !== null && val >= medio && worst < 2) worst = 2
      else if (leve !== null && val >= leve && worst < 1) worst = 1
    }
    if (worst === 3) return '#ef5350'
    if (worst === 2) return '#fb923c'
    if (worst === 1) return '#fdd835'
    return 'success'
  }

  const harmonieAccumMm = computed((): number | null => {
    if (props.activeTab !== 'precipitaciones') return null
    return sumPredictionHours(props.precipitationsForecastHarmonie, 72)
  })

  const epsAccumMm = computed((): number | null => {
    if (props.activeTab !== 'precipitaciones') return null
    return sumPredictionHours(props.precipitationsForecastEpstat, 144)
  })

  const harmonieAlertColor = computed((): string => {
    if (props.activeTab !== 'precipitaciones') return 'primary'
    return getPrecipAlertColor(props.precipitationsForecastHarmonie)
  })

  const epsAlertColor = computed((): string => {
    if (props.activeTab !== 'precipitaciones') return 'primary'
    return getPrecipAlertColor(props.precipitationsForecastEpstat)
  })

  const harmonieSelectedDate = computed(() => {
    if (props.activeTab === 'precipitaciones') return selectedHarmoniePrecipDateModel.value
    if (selectedSource.value === 'mike') return selectedMikeHarmonieDateModel.value
    return selectedHarmonieCaudalDateModel.value
  })

  const setHarmonieDate = (value: string) => updateHarmonieDate(value)

  const harmonieDateOptions = computed(() => {
    let dates: string[] | undefined
    if (props.activeTab === 'precipitaciones') {
      dates = props.harmoniePrecipDates
    } else if (selectedSource.value === 'mike') {
      dates = props.mikeHarmonieDates
    } else {
      dates = props.harmonieCaudalDates
    }
    return (dates ?? []).map((date) => ({ title: formatSimulationDate(date), value: date }))
  })

  const epsSelectedDate = computed(() => {
    if (props.activeTab === 'precipitaciones') return selectedEpsPrecipDateModel.value
    if (selectedSource.value === 'mike') return selectedMikeHarmonieDateModel.value
    return selectedEpsCaudalDateModel.value
  })

  const setEpsDate = (value: string) => updateEpsDate(value)

  const epsDateOptions = computed(() => {
    let dates: string[] | undefined
    if (props.activeTab === 'precipitaciones') {
      dates = props.epsPrecipDates
    } else if (selectedSource.value === 'mike') {
      dates = props.mikeHarmonieDates
    } else {
      dates = props.epsCaudalDates
    }
    return (dates ?? []).map((date) => ({ title: formatSimulationDate(date), value: date }))
  })

  function updateHarmonieDate(value: string): void {
    if (props.activeTab === 'precipitaciones') {
      selectedHarmoniePrecipDateModel.value = value
    } else if (selectedSource.value === 'mike') {
      selectedMikeHarmonieDateModel.value = value
    } else {
      selectedHarmonieCaudalDateModel.value = value
    }
  }

  function updateEpsDate(value: string): void {
    if (props.activeTab === 'precipitaciones') {
      selectedEpsPrecipDateModel.value = value
    } else if (selectedSource.value === 'mike') {
      selectedMikeHarmonieDateModel.value = value
    } else {
      selectedEpsCaudalDateModel.value = value
    }
  }
</script>

<style scoped></style>
