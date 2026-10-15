<template>
  <div v-if="isPrecipitacionModel" class="map-precip-horizon-toggle">
    <v-btn-toggle
      v-model="precipHorizonStore.selectedHours"
      mandatory
      density="compact"
      divided
      variant="flat"
      color="primary"
      rounded="lg"
      elevation="4"
      class="bg-primary flex-column"
    >
      <v-btn v-for="hours in HOURS" :key="hours" :value="hours" size="small">
        {{ formatLabel(hours) }}
      </v-btn>
    </v-btn-toggle>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useMapModelStore } from '@/stores/mapModelStore'
  import { useMapDataSourceStore } from '@/stores/mapDataSourceStore'
  import { useMapPrecipHorizonStore } from '@/stores/mapPrecipHorizonStore'
  import type { PrecipAccumulatedHours } from '@/types/Predictions'

  const modelStore = useMapModelStore()
  const dataSourceStore = useMapDataSourceStore()
  const precipHorizonStore = useMapPrecipHorizonStore()

  const isPrecipitacionModel = computed(() => modelStore.selectedModel === 'precipitacion')

  const HOURS: PrecipAccumulatedHours[] = [1, 2, 4, 8, 12, 24]

  // The selected hours value is the same regardless of data source — only
  // the displayed sign changes: Observado looks back in time (-1h ...
  // -24h), Harmonie/EPS Medio are forecasts looking ahead (+1h ... +24h).
  function formatLabel(hours: PrecipAccumulatedHours): string {
    const sign = dataSourceStore.selectedDataSource === 'observado' ? '-' : '+'
    return `${sign}${hours}h`
  }
</script>

<style scoped>
  .map-precip-horizon-toggle {
    position: absolute;
    top: 76px;
    right: 20px;
    z-index: 1000;
  }

  /* v-btn-toggle's group root has a fixed height meant for a single
     horizontal row — switching it to a column via the flex-column utility
     class doesn't override that, so the 6 stacked buttons get squashed to
     fit the original row height instead of growing to contain them. */
  .map-precip-horizon-toggle :deep(.v-btn-group) {
    height: auto;
    /* Vuetify's rounded="lg" + divided only rounds the first button's left
       corners and the last button's right corners — correct for a row,
       but in this column layout the group's own clipping corner (top for
       the first button, bottom for the last) was never rounded to match,
       leaving a small square sliver where the button's dark background
       poked past the rounded container edge. Rounding here instead, with
       overflow:hidden to clip every button to it, fixes both ends at once. */
    border-radius: 8px;
    overflow: hidden;
  }

  .map-precip-horizon-toggle :deep(.v-btn-group .v-btn) {
    width: 100%;
    /* Each button otherwise inherits a percentage height resolved against
       the group's now-auto height, collapsing to its text line-height
       instead of a normal button size. Vuetify's own rule for this is at
       least as specific, so !important is needed to actually win. */
    height: 36px !important;
    /* Remove each button's own row-oriented corner rounding now that the
       group above handles it uniformly. */
    border-radius: 0 !important;
  }
</style>
