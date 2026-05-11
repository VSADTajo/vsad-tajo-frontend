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
      <template v-if="activeTab === 'caudal'">
        <div class="text-caption text-medium-emphasis font-weight-bold mb-1">
          {{ isEmbalse ? 'Caudal de entrada' : 'Caudal observado' }}
        </div>
        <v-row>
          <v-col cols="7" class="text-caption text-medium-emphasis align-center">
            Último observado
          </v-col>
          <v-col cols="5" class="text-right font-weight-medium pr-2 align-center">
            <v-chip :color="lastValueColor" size="small" variant="flat">
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
          <v-col cols="7" class="text-caption text-medium-emphasis align-center">
            Máximo observado
          </v-col>
          <v-col cols="5" class="text-right font-weight-medium pr-2 align-center">
            <v-chip :color="maxValueColor" size="small" variant="flat">
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

        <template v-if="isEmbalse">
          <v-divider class="my-2" />
          <div class="text-caption text-medium-emphasis font-weight-bold mb-1">
            Caudal de salida
          </div>
          <v-row>
            <v-col cols="7" class="text-caption text-medium-emphasis align-center">
              Último observado
            </v-col>
            <v-col cols="5" class="text-right font-weight-medium pr-2 align-center">
              <v-chip size="small" variant="flat">
                {{ outflowLastLabel }}
              </v-chip>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="5" class="text-caption text-medium-emphasis align-center">
              Fecha último
            </v-col>
            <v-col cols="7" class="text-right font-weight-medium align-center">
              {{ outflowLastDateLabel }}
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="7" class="text-caption text-medium-emphasis align-center">
              Máximo observado
            </v-col>
            <v-col cols="5" class="text-right font-weight-medium pr-2 align-center">
              <v-chip size="small" variant="flat">
                {{ outflowMaxLabel }}
              </v-chip>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="5" class="text-caption text-medium-emphasis align-center">
              Fecha máximo
            </v-col>
            <v-col cols="7" class="text-right font-weight-medium align-center">
              {{ outflowMaxDateLabel }}
            </v-col>
          </v-row>

          <v-divider class="my-2" />
          <div class="text-caption text-medium-emphasis font-weight-bold mb-1">Volumen</div>
          <v-row>
            <v-col cols="7" class="text-caption text-medium-emphasis align-center">
              Último observado
            </v-col>
            <v-col cols="5" class="text-right font-weight-medium pr-2 align-center">
              <v-chip :color="volumeLastValueColor" size="small" variant="flat">
                {{ volumeLastLabel }}
              </v-chip>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="5" class="text-caption text-medium-emphasis align-center">
              Fecha último
            </v-col>
            <v-col cols="7" class="text-right font-weight-medium align-center">
              {{ volumeLastDateLabel }}
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="7" class="text-caption text-medium-emphasis align-center">
              Máximo observado
            </v-col>
            <v-col cols="5" class="text-right font-weight-medium pr-2 align-center">
              <v-chip :color="volumeMaxValueColor" size="small" variant="flat">
                {{ volumeMaxLabel }}
              </v-chip>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="5" class="text-caption text-medium-emphasis align-center">
              Fecha máximo
            </v-col>
            <v-col cols="7" class="text-right font-weight-medium align-center">
              {{ volumeMaxDateLabel }}
            </v-col>
          </v-row>
        </template>
      </template>

      <template v-else>
        <v-row>
          <v-col cols="7" class="text-caption text-medium-emphasis align-center">
            Último observado
          </v-col>
          <v-col cols="5" class="text-right font-weight-medium pr-2 align-center">
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
          <v-col cols="7" class="text-caption text-medium-emphasis align-center">
            Máximo observado
          </v-col>
          <v-col cols="5" class="text-right font-weight-medium pr-2 align-center">
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
      </template>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { formatDate, toTimestamp } from '@/utils/dates'
  import type { StationPrediction } from '@/types/Predictions'

  const props = defineProps<{
    activeTab: 'caudal' | 'precipitaciones'
    loading?: boolean
    isEmbalse?: boolean
    caudalHistorical?: StationPrediction
    caudalOutflowHistorical?: StationPrediction
    embalseVolumeHistorical?: StationPrediction
    precipitationsHistorical?: StationPrediction
    thresholds?: Record<string, unknown>
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
    unit: 'm3/s' | 'mm' | 'hm3'
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

  const baseSummary = computed(() =>
    props.activeTab === 'caudal'
      ? summarizePrediction(props.caudalHistorical, 'm3/s')
      : summarizePrediction(props.precipitationsHistorical, 'mm')
  )

  const outflowSummary = computed(() => summarizePrediction(props.caudalOutflowHistorical, 'm3/s'))
  const volumeSummary = computed(() => summarizePrediction(props.embalseVolumeHistorical, 'hm3'))

  const lastObservedValueLabel = computed(() => baseSummary.value.lastValueLabel)
  const maxObservedValueLabel = computed(() => baseSummary.value.maxValueLabel)
  const lastObservedDateLabel = computed(() => baseSummary.value.lastDateLabel)
  const maxObservedDateLabel = computed(() => baseSummary.value.maxDateLabel)

  const outflowLastLabel = computed(() => outflowSummary.value.lastValueLabel)
  const outflowMaxLabel = computed(() => outflowSummary.value.maxValueLabel)
  const outflowLastDateLabel = computed(() => outflowSummary.value.lastDateLabel)
  const outflowMaxDateLabel = computed(() => outflowSummary.value.maxDateLabel)

  const volumeLastLabel = computed(() => volumeSummary.value.lastValueLabel)
  const volumeMaxLabel = computed(() => volumeSummary.value.maxValueLabel)
  const volumeLastDateLabel = computed(() => volumeSummary.value.lastDateLabel)
  const volumeMaxDateLabel = computed(() => volumeSummary.value.maxDateLabel)

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
</script>

<style scoped></style>
