<template>
  <v-card class="pa-2 bg-surface" elevation="2">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2 py-2 px-0">
      <span class="text-subtitle-1 font-weight-bold pl-2">Prevision Precipitación</span>
      <v-btn-toggle
        v-model="selectedProvider"
        mandatory
        density="compact"
        color="primary"
        variant="outlined"
      >
        <v-btn value="harmonie" size="small">Harmonie</v-btn>
        <v-btn value="eps" size="small">EPS</v-btn>
      </v-btn-toggle>
    </v-card-title>

    <v-divider class="mb-2" />

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
  import { extractAccumulatedHorizonValues, PRECIP_HORIZON_META } from '../utils/precipAccumulation'

  type ThresholdValues = {
    h0?: number
    h15m?: number
    h1?: number
    h2?: number
    h4?: number
    h8?: number
    h12?: number
    h24?: number
  }

  type TableRow = {
    periodo: string
    valor: number | null
    leve: number | null
    grave: number | null
    estado: 'NORMAL' | 'LEVE' | 'GRAVE'
  }

  const props = withDefaults(
    defineProps<{
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
      thresholdsGrave?: ThresholdValues
    }>(),
    {
      precipitationsForecastHarmonie: undefined,
      precipitationsForecastEpstat: undefined,
      precipitationsForecastEnsP10: undefined,
      precipitationsForecastEnsP25: undefined,
      precipitationsForecastEnsP75: undefined,
      precipitationsForecastEnsP90: undefined,
      forecastHarmonie: undefined,
      forecastEpsat: undefined,
      loading: false,
      thresholdsLeve: () => ({
        h15m: 5,
        h1: 10,
        h2: 12,
        h4: 13,
        h8: 15,
        h12: 20,
        h24: 30,
      }),
      thresholdsGrave: () => ({
        h15m: 7.5,
        h1: 15,
        h2: 18,
        h4: 19.5,
        h8: 22.5,
        h12: 30,
        h24: 45,
      }),
    }
  )

  const selectedProvider = ref<'harmonie' | 'eps'>('eps')

  const headers = [
    { title: 'Periodo', key: 'periodo', sortable: false, width: 80 },
    { title: 'Valor', key: 'valor', align: 'end' as const, sortable: false, width: 70 },
    { title: 'Leve', key: 'leve', align: 'end' as const, sortable: false, width: 70 },
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
    selectedProvider.value === 'harmonie' ? harmoniePrediction.value : epsPrediction.value
  )

  const horizonValues = computed(() => extractAccumulatedHorizonValues(selectedPrediction.value))

  function getStatus(
    valor: number | null,
    leve: number | null | undefined,
    grave: number | null | undefined
  ): 'NORMAL' | 'LEVE' | 'GRAVE' {
    if (valor == null) return 'NORMAL'
    if (grave != null && valor >= grave) return 'GRAVE'
    if (leve != null && valor >= leve) return 'LEVE'
    return 'NORMAL'
  }

  function formatValue(value: number | null): string {
    if (value == null || !Number.isFinite(value)) return '--'
    return value.toFixed(1)
  }

  function getStatusColor(estado: 'NORMAL' | 'LEVE' | 'GRAVE'): string {
    if (estado === 'GRAVE') return '#ef5350'
    if (estado === 'LEVE') return '#fdd835'
    return 'transparent'
  }

  function getStatusTextColor(estado: 'NORMAL' | 'LEVE' | 'GRAVE'): string {
    if (estado === 'GRAVE') return 'white'
    if (estado === 'LEVE') return '#333'
    return '#333'
  }

  const tableRows = computed<TableRow[]>(() => {
    const rows: TableRow[] = []

    for (const { key, label } of PRECIP_HORIZON_META) {
      const valor = horizonValues.value[key]
      const leve = props.thresholdsLeve?.[key] ?? null
      const grave = props.thresholdsGrave?.[key] ?? null
      const estado = getStatus(valor, leve, grave)

      rows.push({
        periodo: label,
        valor,
        leve,
        grave,
        estado,
      })
    }

    return rows
  })
</script>
