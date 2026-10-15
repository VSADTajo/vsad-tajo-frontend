<template>
  <v-card class="bg-surface" elevation="2">
    <v-tooltip text="Resumen datos observados" location="end">
      <template #activator="{ props: tooltipProps }">
        <v-card-title v-bind="tooltipProps" class="text-body-2 font-weight-bold text-truncate">
          Resumen Datos Observados
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

    <v-card-text v-else class="observed-content">
      <template v-if="hasObservedData && activeTab === 'caudal'">
        <div v-if="isEmbalse && showsEmbalseToggle" class="d-flex justify-center mb-3">
          <v-btn-toggle
            v-model="embalseObservedMode"
            mandatory
            density="compact"
            divided
            variant="outlined"
          >
            <v-btn value="entrada" size="x-small" :disabled="!hasEntradaData">Entr.</v-btn>

            <v-btn value="salida" size="x-small" :disabled="!hasSalidaData">Sal.</v-btn>

            <v-btn
              v-if="embalseSection !== 'caudal'"
              value="volumen"
              size="x-small"
              :disabled="!hasVolumenData"
            >
              Vol.
            </v-btn>
          </v-btn-toggle>
        </div>

        <div class="text-caption text-medium-emphasis font-weight-bold mb-1">
          {{ observedSectionTitle }}
        </div>

        <v-row class="mt-2">
          <v-col cols="6" class="text-caption text-medium-emphasis align-center">
            Último observado
          </v-col>

          <v-col cols="6" class="text-right font-weight-medium pr-2 align-center">
            <v-chip :color="currentLastValueColor" size="small" variant="flat">
              {{ currentSummary.lastValueLabel }}
            </v-chip>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="5" class="text-caption text-medium-emphasis align-center">
            Fecha último
          </v-col>

          <v-col cols="7" class="text-right font-weight-medium align-center">
            {{ currentSummary.lastDateLabel }}
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="6" class="text-caption text-medium-emphasis align-center">
            Máximo observado
          </v-col>

          <v-col cols="6" class="text-right font-weight-medium pr-2 align-center">
            <v-chip :color="currentMaxValueColor" size="small" variant="flat">
              {{ currentSummary.maxValueLabel }}
            </v-chip>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="5" class="text-caption text-medium-emphasis align-center">
            Fecha máximo
          </v-col>

          <v-col cols="7" class="text-right font-weight-medium align-center">
            {{ currentSummary.maxDateLabel }}
          </v-col>
        </v-row>
      </template>

      <template v-else-if="hasObservedData">
        <v-row>
          <v-col cols="6" class="text-caption text-medium-emphasis align-center">
            Último observado
          </v-col>

          <v-col cols="6" class="text-right font-weight-medium pr-2 align-center">
            <v-chip size="small" variant="flat">
              {{ lastObservedValueLabel }}
            </v-chip>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="5" class="text-caption text-medium-emphasis align-center">
            Fecha último
          </v-col>

          <v-col cols="7" class="text-right font-weight-medium align-center">
            {{ lastObservedDateLabel }}
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="6" class="text-caption text-medium-emphasis align-center">
            Máximo observado
          </v-col>

          <v-col cols="6" class="text-right font-weight-medium pr-2 align-center">
            <v-chip size="small" variant="flat">
              {{ maxObservedValueLabel }}
            </v-chip>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="5" class="text-caption text-medium-emphasis align-center">
            Fecha máximo
          </v-col>

          <v-col cols="7" class="text-right font-weight-medium align-center">
            {{ maxObservedDateLabel }}
          </v-col>
        </v-row>

        <v-row v-if="totalObservedPrecipMm !== null">
          <v-col cols="6" class="text-caption text-medium-emphasis align-center">
            Acumulado {{ accumDays }}d
          </v-col>

          <v-col cols="6" class="text-right font-weight-medium pr-2 align-center">
            <v-chip size="small" :color="precipAlertColor" variant="tonal">
              {{ totalObservedPrecipMm.toFixed(1) }} mm
            </v-chip>
          </v-col>
        </v-row>
      </template>

      <div v-else class="observed-empty-state text-medium-emphasis">
        No se han encontrado datos observados
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed, ref, watchEffect } from 'vue'

  import { formatDate, toTimestamp } from '@/utils/dates'

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

  type EmbalseObservedMode = 'entrada' | 'salida' | 'volumen'

  const props = withDefaults(
    defineProps<{
      activeTab?: 'caudal' | 'precipitaciones' | 'nivel'
      loading?: boolean
      isEmbalse?: boolean
      caudalHistorical?: StationPrediction
      caudalOutflowHistorical?: StationPrediction
      embalseVolumeHistorical?: StationPrediction
      precipitationsHistorical?: StationPrediction
      thresholds?: Record<string, unknown>
      accumDays?: number
      // When the caller has its own chart tabs (e.g. an embalse hidrograma
      // view with separate Entrada/Salida/Volumen tabs), this locks the
      // card to match instead of letting it pick independently via its own
      // toggle: 'entrada'/'salida'/'volumen' hide the toggle entirely and
      // show only that section; 'caudal' keeps the Entr./Sal. toggle but
      // hides Vol. Leave unset to keep the old always-all-three toggle.
      embalseSection?: 'caudal' | 'volumen' | 'entrada' | 'salida'
      // Unit label for 'nivel' activeTab — some stations are really COTA
      // (msnm) rather than plain water level (m). See nivelStations.ts.
      nivelUnit?: string
    }>(),

    {
      activeTab: 'caudal',
      loading: false,
      isEmbalse: false,
      caudalHistorical: undefined,
      caudalOutflowHistorical: undefined,
      embalseVolumeHistorical: undefined,
      precipitationsHistorical: undefined,
      thresholds: undefined,
      accumDays: 10,
      embalseSection: undefined,
      nivelUnit: 'm',
    }
  )

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

  type PredictionSummary = {
    lastValue: number | undefined

    lastValueLabel: string

    lastDateLabel: string

    maxValue: number | undefined

    maxValueLabel: string

    maxDateLabel: string
  }

  function summarizePrediction(
    prediction: StationPrediction | undefined,

    unit: 'm3/s' | 'mm' | 'hm3' | 'm' | 'msnm'
  ): PredictionSummary {
    const orderedResults = [...(prediction?.results ?? [])].sort(
      (a, b) => toTimestamp(a.date) - toTimestamp(b.date)
    )

    const last = orderedResults.length ? orderedResults[orderedResults.length - 1] : undefined

    const max = orderedResults.length
      ? orderedResults.reduce(
          (acc, item) => (item.value > acc.value ? item : acc),

          orderedResults[0]
        )
      : undefined

    return {
      lastValue: last?.value,

      lastValueLabel: formatValue(last?.value, unit),

      lastDateLabel: formatDate(last?.date),

      maxValue: max?.value,

      maxValueLabel: formatValue(max?.value, unit),

      maxDateLabel: formatDate(max?.date),
    }
  }

  const baseSummary = computed(() => {
    if (props.activeTab === 'caudal') return summarizePrediction(props.caudalHistorical, 'm3/s')
    if (props.activeTab === 'nivel') {
      return summarizePrediction(props.caudalHistorical, props.nivelUnit as 'm' | 'msnm')
    }
    return summarizePrediction(props.precipitationsHistorical, 'mm')
  })

  const outflowSummary = computed(() => summarizePrediction(props.caudalOutflowHistorical, 'm3/s'))

  const volumeSummary = computed(() => summarizePrediction(props.embalseVolumeHistorical, 'hm3'))

  function hasResults(prediction: StationPrediction | undefined): boolean {
    return Boolean(prediction?.results?.length)
  }

  const hasEntradaData = computed(() => hasResults(props.caudalHistorical))

  const hasSalidaData = computed(() => hasResults(props.caudalOutflowHistorical))

  const hasVolumenData = computed(() => hasResults(props.embalseVolumeHistorical))

  const embalseObservedMode = ref<EmbalseObservedMode>('entrada')

  // 'entrada'/'salida'/'volumen' are a definitive lock from the caller's
  // own chart tab — no toggle needed since there's nothing left to pick.
  const showsEmbalseToggle = computed(
    () =>
      props.embalseSection !== 'volumen' &&
      props.embalseSection !== 'entrada' &&
      props.embalseSection !== 'salida'
  )

  watchEffect(() => {
    if (!props.isEmbalse || props.activeTab !== 'caudal') return

    if (
      props.embalseSection === 'volumen' ||
      props.embalseSection === 'entrada' ||
      props.embalseSection === 'salida'
    ) {
      embalseObservedMode.value = props.embalseSection
      return
    }

    if (props.embalseSection === 'caudal' && embalseObservedMode.value === 'volumen') {
      embalseObservedMode.value = hasEntradaData.value ? 'entrada' : 'salida'
      return
    }

    const currentHasData =
      embalseObservedMode.value === 'entrada'
        ? hasEntradaData.value
        : embalseObservedMode.value === 'salida'
          ? hasSalidaData.value
          : hasVolumenData.value

    if (!currentHasData) {
      if (hasEntradaData.value) embalseObservedMode.value = 'entrada'
      else if (hasSalidaData.value) embalseObservedMode.value = 'salida'
      else if (hasVolumenData.value) embalseObservedMode.value = 'volumen'
    }
  })

  const observedSectionTitle = computed(() => {
    if (props.activeTab !== 'caudal') return 'Precipitacion observada'

    if (!props.isEmbalse) return 'Caudal observado'

    if (embalseObservedMode.value === 'salida') return 'Caudal de salida'

    if (embalseObservedMode.value === 'volumen') return 'Volumen'

    return 'Caudal de entrada'
  })

  const currentSummary = computed(() => {
    if (props.activeTab !== 'caudal') return baseSummary.value

    if (!props.isEmbalse) return baseSummary.value

    if (embalseObservedMode.value === 'salida') return outflowSummary.value

    if (embalseObservedMode.value === 'volumen') return volumeSummary.value

    return baseSummary.value
  })

  const hasObservedData = computed(() => {
    if (props.activeTab === 'nivel') {
      return hasResults(props.caudalHistorical)
    }

    if (props.activeTab !== 'caudal') {
      return hasResults(props.precipitationsHistorical)
    }

    if (!props.isEmbalse) {
      return hasResults(props.caudalHistorical)
    }

    return (
      hasResults(props.caudalHistorical) ||
      hasResults(props.caudalOutflowHistorical) ||
      hasResults(props.embalseVolumeHistorical)
    )
  })

  const lastObservedValueLabel = computed(() => baseSummary.value.lastValueLabel)

  const maxObservedValueLabel = computed(() => baseSummary.value.maxValueLabel)

  const lastObservedDateLabel = computed(() => baseSummary.value.lastDateLabel)

  const maxObservedDateLabel = computed(() => baseSummary.value.maxDateLabel)

  const totalObservedPrecipMm = computed((): number | null => {
    if (props.activeTab !== 'precipitaciones') return null

    const results = props.precipitationsHistorical?.results

    if (!results?.length) return null

    const cutoff = Date.now() - props.accumDays * 24 * 60 * 60 * 1000
    const vals = results
      .filter((r) => new Date(r.date).getTime() >= cutoff)
      .map((r) => Number(r.value))
      .filter((v) => Number.isFinite(v))

    return vals.length ? vals.reduce((a, b) => a + b, 0) : null
  })

  const precipBackwardValues = computed(() =>
    extractAccumulatedHorizonValuesWithMode(props.precipitationsHistorical, 'backward')
  )

  const precipAlertColor = computed((): string => {
    if (props.activeTab !== 'precipitaciones') return 'success'
    const values = precipBackwardValues.value
    let worst: 0 | 1 | 2 | 3 = 0 // 0=normal, 1=leve, 2=medio, 3=grave
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
  })

  const yellowThreshold = computed(() => readNumber(['umbral_caudal_1'], props.thresholds))

  const orangeThreshold = computed(() => readNumber(['umbral_caudal_2'], props.thresholds))

  const redThreshold = computed(() => readNumber(['umbral_caudal_3'], props.thresholds))

  const volumeThreshold1 = computed(() => readNumber(['umbral_1_volumen'], props.thresholds))

  const volumeThreshold2 = computed(() => readNumber(['umbral_2_volumen'], props.thresholds))

  const volumeThreshold3 = computed(() => readNumber(['umbral_3_volumen'], props.thresholds))

  function getThresholdColor(value: number | undefined): string {
    if (props.activeTab !== 'caudal' || value == null || !Number.isFinite(value)) return ''

    if (redThreshold.value != null && value >= redThreshold.value) return 'red-lighten-3'

    if (orangeThreshold.value != null && value >= orangeThreshold.value) return 'orange-lighten-3'

    if (yellowThreshold.value != null && value >= yellowThreshold.value) return 'amber-lighten-3'

    return ''
  }

  function getVolumeThresholdColor(value: number | undefined): string {
    if (props.activeTab !== 'caudal' || value == null || !Number.isFinite(value)) return ''

    if (volumeThreshold3.value != null && value >= volumeThreshold3.value) return 'red-lighten-3'

    if (volumeThreshold2.value != null && value >= volumeThreshold2.value) return 'orange-lighten-3'

    if (volumeThreshold1.value != null && value >= volumeThreshold1.value) return 'amber-lighten-3'

    return ''
  }

  const lastValueColor = computed(() => getThresholdColor(baseSummary.value.lastValue))

  const maxValueColor = computed(() => getThresholdColor(baseSummary.value.maxValue))

  const volumeLastValueColor = computed(() =>
    getVolumeThresholdColor(volumeSummary.value.lastValue)
  )

  const volumeMaxValueColor = computed(() => getVolumeThresholdColor(volumeSummary.value.maxValue))

  const currentLastValueColor = computed(() => {
    if (props.activeTab !== 'caudal') return ''

    if (!props.isEmbalse) return lastValueColor.value

    if (embalseObservedMode.value === 'volumen') return volumeLastValueColor.value

    return getThresholdColor(currentSummary.value.lastValue)
  })

  const currentMaxValueColor = computed(() => {
    if (props.activeTab !== 'caudal') return ''

    if (!props.isEmbalse) return maxValueColor.value

    if (embalseObservedMode.value === 'volumen') return volumeMaxValueColor.value

    return getThresholdColor(currentSummary.value.maxValue)
  })
</script>

<style scoped>
  .observed-content {
    min-height: 220px;
  }

  .observed-empty-state {
    min-height: inherit;

    height: 100%;

    display: flex;

    align-items: center;

    justify-content: center;

    text-align: center;

    font-weight: 500;
  }
</style>
