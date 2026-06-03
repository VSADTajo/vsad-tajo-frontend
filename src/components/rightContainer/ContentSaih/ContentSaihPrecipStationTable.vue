<template>
  <v-card class="pa-2 bg-surface" elevation="2">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2 py-2 px-0">
      <span class="text-subtitle-1 font-weight-bold pl-2">Prevision Precipitación</span>
    </v-card-title>

    <v-divider class="mb-2" />

    <v-card-text class="pa-0 justify-center d-flex align-center">
      <v-btn-toggle
        v-model="selectedProvider"
        mandatory
        density="compact"
        divided
        color="primary"
        variant="outlined"
      >
        <v-btn value="observed" size="small">Observado</v-btn>
        <v-btn value="harmonie" size="small">Harmonie</v-btn>
        <v-btn value="eps" size="small">EPS</v-btn>
      </v-btn-toggle>
    </v-card-text>

    <v-data-table
      :headers="headers"
      :items="tableRows"
      :items-per-page="-1"
      :loading="loading"
      loading-text="Cargando prediccion..."
      density="compact"
      class="precip-threshold-table"
      hover
      fixed-header
      height="300"
      hide-default-footer
    >
      <template #item.periodo="{ item }">
        <span class="text-caption font-weight-medium">{{ item.periodo }}</span>
      </template>

      <template #item.valor="{ item }">
        <span class="text-caption">{{ formatValue(item.valor) }}</span>
      </template>

      <template #item.leve="{ item }">
        <span class="text-caption">{{ formatValue(item.leve) }}</span>
      </template>

      <template #item.medio="{ item }">
        <span class="text-caption">{{ formatValue(item.medio) }}</span>
      </template>

      <template #item.grave="{ item }">
        <span class="text-caption">{{ formatValue(item.grave) }}</span>
      </template>

      <template #item.estado="{ item }">
        <v-chip
          :color="getStatusColor(item.estado)"
          :text-color="getStatusTextColor(item.estado)"
          size="small"
          class="font-weight-bold"
        >
          {{ item.estado }}
        </v-chip>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
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

  type ThresholdValues = {
    h0?: number | null
    h1?: number | null
    h2?: number | null
    h4?: number | null
    h8?: number | null
    h12?: number | null
    h24?: number | null
  }

  type TableRow = {
    periodo: string
    valor: number | null
    leve: number | null
    medio: number | null
    grave: number | null
    estado: 'NORMAL' | 'LEVE' | 'MEDIO' | 'GRAVE'
  }

  const props = withDefaults(
    defineProps<{
      precipitationsHistorical?: StationPrediction
      precipitationsForecastHarmonie?: StationPrediction
      precipitationsForecastEpstat?: StationPrediction
      precipitationsForecastEnsP10?: StationPrediction
      precipitationsForecastEnsP25?: StationPrediction
      precipitationsForecastEnsP75?: StationPrediction
      precipitationsForecastEnsP90?: StationPrediction
      forecastHarmonie?: StationPrediction
      forecastEpsat?: StationPrediction
      loading?: boolean
      thresholdsLeve?: ThresholdValues
      thresholdsMedio?: ThresholdValues
      thresholdsGrave?: ThresholdValues
    }>(),
    {
      precipitationsForecastHarmonie: undefined,
      precipitationsHistorical: undefined,
      precipitationsForecastEpstat: undefined,
      precipitationsForecastEnsP10: undefined,
      precipitationsForecastEnsP25: undefined,
      precipitationsForecastEnsP75: undefined,
      precipitationsForecastEnsP90: undefined,
      forecastHarmonie: undefined,
      forecastEpsat: undefined,
      loading: false,
      thresholdsLeve: () => ({ ...DEFAULT_PRECIP_THRESHOLDS_LEVE }),
      thresholdsMedio: () => ({ ...DEFAULT_PRECIP_THRESHOLDS_MEDIO }),
      thresholdsGrave: () => ({ ...DEFAULT_PRECIP_THRESHOLDS_GRAVE }),
    }
  )

  const selectedProvider = ref<'observed' | 'harmonie' | 'eps'>('observed')

  const headers = [
    { title: 'Periodo', key: 'periodo', sortable: false, width: 80 },
    { title: 'Valor', key: 'valor', align: 'end' as const, sortable: false, width: 70 },
    { title: 'Leve', key: 'leve', align: 'end' as const, sortable: false, width: 70 },
    { title: 'Medio', key: 'medio', align: 'end' as const, sortable: false, width: 70 },
    { title: 'Grave', key: 'grave', align: 'end' as const, sortable: false, width: 70 },
    { title: 'Estado', key: 'estado', align: 'center' as const, sortable: false, width: 100 },
  ]

  const harmoniePrediction = computed<StationPrediction | undefined>(
    () => props.precipitationsForecastHarmonie ?? props.forecastHarmonie
  )

  const epsPrediction = computed<StationPrediction | undefined>(
    () => props.precipitationsForecastEpstat ?? props.forecastEpsat
  )

  const selectedPrediction = computed<StationPrediction | undefined>(() =>
    selectedProvider.value === 'observed'
      ? props.precipitationsHistorical
      : selectedProvider.value === 'harmonie'
        ? harmoniePrediction.value
        : epsPrediction.value
  )

  const horizonValues = computed(() =>
    extractAccumulatedHorizonValuesWithMode(
      selectedPrediction.value,
      selectedProvider.value === 'observed' ? 'backward' : 'forward'
    )
  )

  const displayHorizons = computed(() => PRECIP_HORIZON_META.filter((item) => item.hours > 0))

  function getStatus(
    valor: number | null,
    leve: number | null | undefined,
    medio: number | null | undefined,
    grave: number | null | undefined
  ): 'NORMAL' | 'LEVE' | 'MEDIO' | 'GRAVE' {
    if (valor == null) return 'NORMAL'
    if (grave != null && valor >= grave) return 'GRAVE'
    if (medio != null && valor >= medio) return 'MEDIO'
    if (leve != null && valor >= leve) return 'LEVE'
    return 'NORMAL'
  }

  function formatValue(value: number | null): string {
    if (value == null || !Number.isFinite(value)) return '--'
    return value.toFixed(1)
  }

  function getStatusColor(estado: 'NORMAL' | 'LEVE' | 'MEDIO' | 'GRAVE'): string {
    if (estado === 'GRAVE') return '#ef5350'
    if (estado === 'MEDIO') return '#fb923c'
    if (estado === 'LEVE') return '#fdd835'
    return 'transparent'
  }

  function getStatusTextColor(estado: 'NORMAL' | 'LEVE' | 'MEDIO' | 'GRAVE'): string {
    if (estado === 'GRAVE') return 'white'
    if (estado === 'MEDIO') return '#5b2a00'
    if (estado === 'LEVE') return '#333'
    return '#333'
  }

  const tableRows = computed<TableRow[]>(() => {
    const rows: TableRow[] = []

    for (const { key, label } of displayHorizons.value) {
      const valor = horizonValues.value[key]
      const leve = props.thresholdsLeve?.[key] ?? null
      const medio = props.thresholdsMedio?.[key] ?? null
      const grave = props.thresholdsGrave?.[key] ?? null
      const estado = getStatus(valor, leve, medio, grave)

      rows.push({
        periodo: label,
        valor,
        leve,
        medio,
        grave,
        estado,
      })
    }

    return rows
  })
</script>
