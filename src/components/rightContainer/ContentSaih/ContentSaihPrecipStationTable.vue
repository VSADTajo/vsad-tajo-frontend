<template>
  <v-card class="pa-2 bg-background" elevation="2">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2 py-2 px-0">
      <span class="text-subtitle-2 font-weight-bold pl-2">Prevision</span>
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

  type HorizonValues = {
    h15m: number | null
    h1: number | null
    h2: number | null
    h4: number | null
    h8: number | null
    h12: number | null
    h24: number | null
  }

  type ThresholdValues = {
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
      forecastHarmonie?: StationPrediction
      forecastEpsat?: StationPrediction
      loading?: boolean
      thresholdsLeve?: ThresholdValues
      thresholdsGrave?: ThresholdValues
    }>(),
    {
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

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000
  const HORIZON_HOURS = [0.25, 1, 2, 4, 8, 12, 24] as const

  function emptyHorizons(): HorizonValues {
    return { h15m: null, h1: null, h2: null, h4: null, h8: null, h12: null, h24: null }
  }

  function extractHorizonValues(prediction?: StationPrediction): HorizonValues {
    const result = emptyHorizons()
    if (!prediction?.results?.length) return result

    const now = Date.now()
    const keyMap: Record<number, keyof HorizonValues> = {
      0.25: 'h15m',
      1: 'h1',
      2: 'h2',
      4: 'h4',
      8: 'h8',
      12: 'h12',
      24: 'h24',
    }

    for (const hours of HORIZON_HOURS) {
      const targetMs = now + hours * 60 * 60 * 1000
      let closest: { value: number } | null = null
      let minDiff = Infinity

      for (const r of prediction.results) {
        const rMs = new Date(r.date).getTime()
        const diff = Math.abs(rMs - targetMs)
        if (diff < minDiff) {
          minDiff = diff
          closest = r
        }
      }

      if (closest && minDiff < TWO_HOURS_MS) {
        const num = Number(closest.value)
        result[keyMap[hours]] = Number.isFinite(num) ? num : null
      }
    }

    return result
  }

  const selectedPrediction = computed<StationPrediction | undefined>(() =>
    selectedProvider.value === 'harmonie' ? props.forecastHarmonie : props.forecastEpsat
  )

  const horizonValues = computed(() => extractHorizonValues(selectedPrediction.value))

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

    const horizonMap = [
      { key: 'h15m' as const, label: '+15m' },
      { key: 'h1' as const, label: '+1h' },
      { key: 'h2' as const, label: '+2h' },
      { key: 'h4' as const, label: '+4h' },
      { key: 'h8' as const, label: '+8h' },
      { key: 'h12' as const, label: '+12h' },
      { key: 'h24' as const, label: '+24h' },
    ]

    for (const { key, label } of horizonMap) {
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
