<template>
  <v-card class="pa-2 bg-surface" elevation="2">
    <v-card-title class="d-flex align-center justify-space-between ga-2 py-3 px-4">
      <div class="text-subtitle-2 font-weight-bold">Resguardo Anual</div>
      <v-select
        v-model="selectedHydrologicalYear"
        :items="hydrologicalYearOptions"
        density="compact"
        variant="outlined"
        hide-details
        class="resguardos-year-select"
        label="Año"
      />
    </v-card-title>
    <v-divider />
    <v-card-text>
      <div class="chart-container">
        <apexchart
          v-if="hasSeries"
          type="line"
          :height="200"
          :options="chartOptions"
          :series="series"
        />
        <div v-else class="chart-empty-state">Sin datos para mostrar</div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { ApexOptions } from 'apexcharts'
  import type { SeriesItem, StationPrediction } from '@/types/Predictions'

  const props = defineProps<{
    resguardoPrediction?: StationPrediction
    volumenMinimoPrediction?: StationPrediction
  }>()

  const selectedHydrologicalYear = ref('2025-2026')
  const hydrologicalYearOptions = ['2025-2026', '2024-2025']

  function normalizeResults(
    prediction?: StationPrediction
  ): Array<{ date: string; value: number }> {
    const items = prediction?.results ?? []
    return items
      .map((item) => {
        const value = Number(item.value)
        const timestamp = new Date(item.date).getTime()
        if (!Number.isFinite(value) || !Number.isFinite(timestamp)) return null
        return { date: item.date, value }
      })
      .filter((item): item is { date: string; value: number } => item !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const resguardoData = computed(() => normalizeResults(props.resguardoPrediction))
  const minimoData = computed(() => normalizeResults(props.volumenMinimoPrediction))

  const series = computed<SeriesItem[]>(() => {
    const result: SeriesItem[] = []

    if (resguardoData.value.length) {
      result.push({
        name: 'Resguardo',
        type: 'line',
        data: resguardoData.value.map((item) => ({
          x: item.date,
          y: item.value,
        })),
      })
    }

    if (minimoData.value.length) {
      result.push({
        name: 'Volumen mínimo',
        type: 'line',
        data: minimoData.value.map((item) => ({
          x: item.date,
          y: item.value,
        })),
      })
    }

    return result
  })

  const hasSeries = computed(() => series.value.length > 0)

  const chartOptions = computed<ApexOptions>(() => ({
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ['#5E35B1', '#26A69A'],
    stroke: {
      curve: 'smooth',
      width: [3, 3],
      dashArray: [0, 6],
    },
    dataLabels: { enabled: false },
    legend: {
      position: 'bottom',
      horizontalAlign: 'left',
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
      },
    },
    yaxis: {
      min: 0,
      title: { text: 'hm3' },
      labels: {
        formatter: (value: number) => value.toFixed(1),
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number) => `${value.toFixed(1)} hm3`,
      },
    },
  }))
</script>

<style scoped>
  .resguardos-year-select {
    max-width: 120px;
  }

  .chart-container {
    min-height: 200px;
  }

  .chart-empty-state {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(0, 0, 0, 0.6);
  }
</style>
