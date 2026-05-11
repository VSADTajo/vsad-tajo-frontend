<template>
  <v-card class="bg-background" elevation="0">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2 py-2 px-0">
      <div class="text-subtitle-1 font-weight-bold">Estaciones de subcuenca</div>

      <v-btn-toggle
        v-model="selectedSeries"
        mandatory
        density="compact"
        color="primary"
        variant="outlined"
      >
        <v-btn value="caudal" size="small">Caudal</v-btn>
        <v-btn value="precipitacion" size="small">Precipitación</v-btn>
      </v-btn-toggle>

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

    <v-divider class="mb-3" />

    <v-data-table
      :headers="headers"
      :items="rows"
      item-value="codigo"
      density="compact"
      class="stations-table"
      hover
      fixed-header
      height="380"
      :row-props="getRowProps"
      @click:row="onRowClick"
    >
      <template #item.nombre="{ item }">
        <span class="font-weight-medium">{{ item.nombre }}</span>
      </template>

      <template #item.codigo="{ item }">
        <span class="text-medium-emphasis">{{ item.codigo }}</span>
      </template>

      <template #item.h1="{ item }">{{ formatValue(item.h1, providerFactor) }}</template>
      <template #item.h2="{ item }">{{ formatValue(item.h2, providerFactor) }}</template>
      <template #item.h4="{ item }">{{ formatValue(item.h4, providerFactor) }}</template>
      <template #item.h8="{ item }">{{ formatValue(item.h8, providerFactor) }}</template>
      <template #item.h12="{ item }">{{ formatValue(item.h12, providerFactor) }}</template>
      <template #item.h24="{ item }">{{ formatValue(item.h24, providerFactor) }}</template>

      <template #bottom>
        <div class="px-4 py-2 text-caption text-medium-emphasis">
          {{ selectedRowCode ? 1 : 0 }} estaciones seleccionadas
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import type { DataStationPrediction, StationPrediction } from '@/types/Predictions'
  import { useSubcuencaSelectionBus } from '@/composables/useSubcuencaSelectionBus'

  type DataSeries = 'caudal' | 'precipitacion'
  type DataProvider = 'harmonie' | 'eps'

  type StationForecastRow = {
    nombre: string
    codigo: string
    h1: number | null
    h2: number | null
    h4: number | null
    h8: number | null
    h12: number | null
    h24: number | null
  }

  const selectedSeries = ref<DataSeries>('caudal')
  const selectedProvider = ref<DataProvider>('harmonie')
  const selectedRowCode = ref<string | null>(null)
  const selectionBus = useSubcuencaSelectionBus()
  const providerFactor = computed(() => (selectedProvider.value === 'harmonie' ? 1 : 1.08))

  const caudalRows = ref<StationForecastRow[]>([
    {
      nombre: 'Talavera Norte',
      codigo: 'TAJ-001',
      h1: 12.4,
      h2: 14.1,
      h4: 17.8,
      h8: 21.5,
      h12: 19.2,
      h24: 15.7,
    },
    {
      nombre: 'Aranjuez Centro',
      codigo: 'TAJ-014',
      h1: 9.2,
      h2: 10.1,
      h4: 12.0,
      h8: 13.8,
      h12: 12.3,
      h24: 10.9,
    },
    {
      nombre: 'Toledo Puente',
      codigo: 'TAJ-028',
      h1: 18.1,
      h2: 20.2,
      h4: 23.6,
      h8: 26.9,
      h12: 24.8,
      h24: 20.5,
    },
  ])

  const precipRows = ref<StationForecastRow[]>([
    {
      nombre: 'Talavera Norte',
      codigo: 'TAJ-001',
      h1: 0.6,
      h2: 1.3,
      h4: 2.4,
      h8: 4.2,
      h12: 5.1,
      h24: 7.0,
    },
    {
      nombre: 'Aranjuez Centro',
      codigo: 'TAJ-014',
      h1: 0.2,
      h2: 0.9,
      h4: 1.8,
      h8: 2.9,
      h12: 3.6,
      h24: 5.2,
    },
    {
      nombre: 'Toledo Puente',
      codigo: 'TAJ-028',
      h1: 0.8,
      h2: 1.7,
      h4: 3.2,
      h8: 5.7,
      h12: 6.4,
      h24: 8.1,
    },
  ])

  const headers = computed(() => [
    { title: 'Estación', key: 'nombre', sortable: true, width: 180 },
    { title: 'Código', key: 'codigo', sortable: true, width: 120 },
    { title: '1h', key: 'h1', align: 'end' as const, sortable: false, width: 70 },
    { title: '2h', key: 'h2', align: 'end' as const, sortable: false, width: 70 },
    { title: '4h', key: 'h4', align: 'end' as const, sortable: false, width: 70 },
    { title: '8h', key: 'h8', align: 'end' as const, sortable: false, width: 70 },
    { title: '12h', key: 'h12', align: 'end' as const, sortable: false, width: 80 },
    { title: '24h', key: 'h24', align: 'end' as const, sortable: false, width: 80 },
  ])

  const rows = computed(() =>
    selectedSeries.value === 'caudal' ? caudalRows.value : precipRows.value
  )

  watch(selectedSeries, () => {
    selectedRowCode.value = null
    selectionBus.emit({
      series: selectedSeries.value,
      station: null,
      data: null,
    })
  })

  watch(selectedProvider, () => {
    selectedRowCode.value = null
    selectionBus.emit({
      series: selectedSeries.value,
      station: null,
      data: null,
    })
  })

  function buildHourlyResults(row: StationForecastRow, factor: number) {
    const horizonValues: Array<{ hour: number; value: number | null }> = [
      { hour: 1, value: row.h1 },
      { hour: 2, value: row.h2 },
      { hour: 4, value: row.h4 },
      { hour: 8, value: row.h8 },
      { hour: 12, value: row.h12 },
      { hour: 24, value: row.h24 },
    ]

    const baseDate = new Date()

    return horizonValues
      .map((item, index) => {
        if (!Number.isFinite(item.value)) return null

        return {
          id: index + 1,
          date: new Date(baseDate.getTime() + item.hour * 60 * 60 * 1000).toISOString(),
          value: Number((Number(item.value) * factor).toFixed(2)),
          flag: 0,
        }
      })
      .filter(
        (item): item is { id: number; date: string; value: number; flag: number } => item !== null
      )
  }

  function buildPrediction(
    row: StationForecastRow,
    predictionTypeName: string,
    factor: number
  ): StationPrediction {
    return {
      id: `${predictionTypeName}-${row.codigo}`,
      stationId: row.codigo,
      stationName: row.nombre,
      predictionTypeName,
      simulationDate: new Date().toISOString(),
      predictionDate: new Date().toISOString(),
      predictionProvider: 'subcuenca-mock',
      predictedBy: 'subcuenca-table',
      results: buildHourlyResults(row, factor),
    }
  }

  function toChartData(row: StationForecastRow): DataStationPrediction {
    if (selectedSeries.value === 'caudal') {
      return {
        forecastHarmonie: buildPrediction(row, 'Q.NAM.harmonie', 1),
        forecastEpsat: buildPrediction(row, 'Q.NAM.ens', 1.08),
      }
    }

    return {
      forecastHarmonie: buildPrediction(row, 'P.harmonie.forecast', 1),
      forecastEpsat: buildPrediction(row, 'P.ens.forecast', 1.08),
    }
  }

  function emitSelection(row: StationForecastRow | null) {
    selectionBus.emit({
      series: selectedSeries.value,
      station: row ? { codigo: row.codigo, nombre: row.nombre } : null,
      data: row ? toChartData(row) : null,
    })
  }

  function extractRow(payload: unknown): StationForecastRow | null {
    if (!payload || typeof payload !== 'object') return null

    const maybeRow = payload as {
      codigo?: unknown
      item?: { raw?: unknown; codigo?: unknown }
    }

    const directCode = maybeRow.codigo
    if (typeof directCode === 'string') {
      return rows.value.find((row) => row.codigo === directCode) ?? null
    }

    const nestedRaw = maybeRow.item?.raw
    if (nestedRaw && typeof nestedRaw === 'object') {
      const code = (nestedRaw as { codigo?: unknown }).codigo
      if (typeof code === 'string') {
        return rows.value.find((row) => row.codigo === code) ?? null
      }
    }

    const nestedCode = maybeRow.item?.codigo
    if (typeof nestedCode === 'string') {
      return rows.value.find((row) => row.codigo === nestedCode) ?? null
    }

    return null
  }

  function onRowClick(_: Event, payload: unknown) {
    const row = extractRow(payload)
    if (!row) return

    const willSelect = selectedRowCode.value !== row.codigo
    selectedRowCode.value = willSelect ? row.codigo : null
    emitSelection(willSelect ? row : null)
  }

  function getRowProps(payload: unknown): { class: string; style: string } {
    const row = extractRow(payload)
    const isSelected = row ? selectedRowCode.value === row.codigo : false

    return {
      class: isSelected ? 'stations-table__row--selected' : '',
      style: 'cursor: pointer;',
    }
  }

  function formatValue(value: number | null, factor = 1): string {
    if (value == null) return '--'
    return (value * factor).toFixed(1)
  }
</script>

<style scoped>
  .stations-table :deep(.v-data-table__th),
  .stations-table :deep(.v-data-table__td) {
    white-space: nowrap;
  }

  .stations-table :deep(.stations-table__row--selected td) {
    background: rgba(var(--v-theme-primary), 0.12);
  }
</style>
