<template>
  <v-card class="bg-surface h-100" elevation="2">
    <v-card-title class="text-subtitle-1 font-weight-bold">Estado Segun Predicciones</v-card-title>
    <v-divider />

    <v-card-text v-if="loading" class="justify-center d-flex align-center">
      <v-skeleton-loader type="chip" class="alert-chip-skeleton" />
    </v-card-text>

    <v-card-text v-else class="justify-center d-flex align-center">
      <v-chip :color="statusChipColor" variant="flat" size="large" label class="alert-chip">
        {{ statusLabel }}
      </v-chip>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { StationPrediction } from '@/types/Predictions'
  import {
    extractAccumulatedHorizonValues,
    PRECIP_HORIZON_META,
    type PrecipHorizonKey,
  } from '../utils/precipAccumulation'

  type AlertLevel = 'NORMAL' | 'LEVE' | 'GRAVE'
  type ThresholdMap = Record<PrecipHorizonKey, number | null>
  type TriggeredState = {
    level: AlertLevel
    horizonLabel: string | null
  }

  const DEFAULT_THRESHOLDS_LEVE: ThresholdMap = {
    h0: 0,
    h1: 10,
    h2: 12,
    h4: 13,
    h8: 15,
    h12: 20,
    h24: 30,
  }

  const DEFAULT_THRESHOLDS_GRAVE: ThresholdMap = {
    h0: 0,
    h1: 15,
    h2: 18,
    h4: 19.5,
    h8: 22.5,
    h12: 30,
    h24: 45,
  }

  const props = withDefaults(
    defineProps<{
      precipitationsForecastHarmonie?: StationPrediction
      precipitationsForecastEpstat?: StationPrediction
      precipitationsForecastEnsP10?: StationPrediction
      precipitationsForecastEnsP25?: StationPrediction
      precipitationsForecastEnsP75?: StationPrediction
      precipitationsForecastEnsP90?: StationPrediction
      thresholds?: Record<string, unknown>
      loading?: boolean
    }>(),
    {
      precipitationsForecastHarmonie: undefined,
      precipitationsForecastEpstat: undefined,
      precipitationsForecastEnsP10: undefined,
      precipitationsForecastEnsP25: undefined,
      precipitationsForecastEnsP75: undefined,
      precipitationsForecastEnsP90: undefined,
      thresholds: undefined,
      loading: false,
    }
  )

  function readNumber(keys: string[], source?: Record<string, unknown>): number | null {
    if (!source) return null

    for (const key of keys) {
      const raw = source[key]
      if (raw == null) continue

      if (typeof raw === 'number' && Number.isFinite(raw)) return raw
      if (typeof raw === 'string') {
        const normalized = raw.trim().replace(',', '.')
        const parsed = Number.parseFloat(normalized)
        if (Number.isFinite(parsed)) return parsed
      }
    }

    return null
  }

  function readThresholdMapFromNested(
    source: Record<string, unknown> | undefined,
    keys: string[]
  ): Partial<ThresholdMap> {
    if (!source) return {}

    for (const key of keys) {
      const nested = source[key]
      if (!nested || typeof nested !== 'object') continue

      const asRecord = nested as Record<string, unknown>
      const out: Partial<ThresholdMap> = {}

      for (const { key: horizonKey } of PRECIP_HORIZON_META) {
        const value = readNumber([horizonKey], asRecord)
        if (value != null) out[horizonKey] = value
      }

      if (Object.keys(out).length > 0) return out
    }

    return {}
  }

  function thresholdKeysFor(
    horizon: { key: PrecipHorizonKey; hours: number },
    level: 'leve' | 'grave'
  ) {
    const suffix = level === 'leve' ? ['leve', '1'] : ['grave', '2']

    return [
      `umbral_precip_${horizon.key}_${suffix[0]}`,
      `umbral_precip_${horizon.hours}h_${suffix[0]}`,
      `umbral_lluvia_${horizon.hours}h_${suffix[0]}`,
      `precip_${horizon.key}_${suffix[0]}`,
      `${horizon.key}_${suffix[0]}`,
      `umbral_precip_${horizon.hours}h_${suffix[1]}`,
      `umbral_lluvia_${horizon.hours}h_${suffix[1]}`,
      `${horizon.key}_${suffix[1]}`,
    ]
  }

  const thresholdsLeve = computed<ThresholdMap>(() => {
    const nested = readThresholdMapFromNested(props.thresholds, [
      'thresholdsLeve',
      'thresholds_leve',
      'umbralesLeve',
      'umbralLeve',
    ])

    const result: ThresholdMap = { ...DEFAULT_THRESHOLDS_LEVE, ...nested }

    for (const horizon of PRECIP_HORIZON_META) {
      if (horizon.hours === 0) continue
      const value = readNumber(thresholdKeysFor(horizon, 'leve'), props.thresholds)
      if (value != null) result[horizon.key] = value
    }

    return result
  })

  const thresholdsGrave = computed<ThresholdMap>(() => {
    const nested = readThresholdMapFromNested(props.thresholds, [
      'thresholdsGrave',
      'thresholds_grave',
      'umbralesGrave',
      'umbralGrave',
    ])

    const result: ThresholdMap = { ...DEFAULT_THRESHOLDS_GRAVE, ...nested }

    for (const horizon of PRECIP_HORIZON_META) {
      if (horizon.hours === 0) continue
      const value = readNumber(thresholdKeysFor(horizon, 'grave'), props.thresholds)
      if (value != null) result[horizon.key] = value
    }

    return result
  })

  const predictionCandidates = computed<StationPrediction[]>(() => {
    const candidates = [
      props.precipitationsForecastHarmonie,
      props.precipitationsForecastEpstat,
      props.precipitationsForecastEnsP10,
      props.precipitationsForecastEnsP25,
      props.precipitationsForecastEnsP75,
      props.precipitationsForecastEnsP90,
    ]

    return candidates.filter((item): item is StationPrediction => Boolean(item?.results?.length))
  })

  const maxAccumulations = computed<ThresholdMap>(() => {
    const result: ThresholdMap = {
      h0: 0,
      h1: null,
      h2: null,
      h4: null,
      h8: null,
      h12: null,
      h24: null,
    }

    for (const prediction of predictionCandidates.value) {
      const horizonValues = extractAccumulatedHorizonValues(prediction)
      for (const horizon of PRECIP_HORIZON_META) {
        const value = horizonValues[horizon.key]
        if (value == null) continue
        const previous = result[horizon.key]
        if (previous == null || value > previous) {
          result[horizon.key] = value
        }
      }
    }

    return result
  })

  const triggeredState = computed<TriggeredState>(() => {
    let bestLeve: { exceedance: number; horizonLabel: string } | null = null
    let bestGrave: { exceedance: number; horizonLabel: string } | null = null

    for (const horizon of PRECIP_HORIZON_META) {
      if (horizon.hours === 0) continue

      const value = maxAccumulations.value[horizon.key]
      if (value == null) continue

      const grave = thresholdsGrave.value[horizon.key]
      if (grave != null && value >= grave) {
        const exceedance = value - grave
        if (!bestGrave || exceedance > bestGrave.exceedance) {
          bestGrave = { exceedance, horizonLabel: `${horizon.hours}h` }
        }
      }

      const leve = thresholdsLeve.value[horizon.key]
      if (leve != null && value >= leve) {
        const exceedance = value - leve
        if (!bestLeve || exceedance > bestLeve.exceedance) {
          bestLeve = { exceedance, horizonLabel: `${horizon.hours}h` }
        }
      }
    }

    if (bestGrave) return { level: 'GRAVE', horizonLabel: bestGrave.horizonLabel }
    if (bestLeve) return { level: 'LEVE', horizonLabel: bestLeve.horizonLabel }
    return { level: 'NORMAL', horizonLabel: null }
  })

  const alertLevel = computed<AlertLevel>(() => triggeredState.value.level)

  const statusLabel = computed<string>(() => {
    if (!triggeredState.value.horizonLabel) return alertLevel.value
    return `${alertLevel.value} (${triggeredState.value.horizonLabel})`
  })

  const statusChipColor = computed<string>(() => {
    switch (alertLevel.value) {
      case 'GRAVE':
        return 'red-lighten-3'
      case 'LEVE':
        return 'amber-lighten-3'
      default:
        return ''
    }
  })
</script>

<style scoped>
  .alert-chip {
    min-width: 128px;
    justify-content: center;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .alert-chip-skeleton {
    width: 128px;
    max-width: 128px;
  }
</style>
