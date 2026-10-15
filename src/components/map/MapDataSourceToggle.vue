<template>
  <div class="map-data-source-toggle">
    <!--
      The model toggle's width changes with its button count (2 for
      Observado, 3 otherwise) — it goes first so that resizing only
      shifts its own left edge, never the data-source toggle next to it.
    -->
    <v-btn-toggle
      v-model="selectedModel"
      mandatory
      density="compact"
      divided
      variant="flat"
      color="primary"
      rounded="lg"
      elevation="4"
      class="bg-primary"
    >
      <template v-if="selectedDataSource === 'observado'">
        <v-btn value="caudal" size="small">Caudal</v-btn>
        <v-btn value="precipitacion" size="small">Precipitaciones</v-btn>
      </template>
      <template v-else>
        <v-btn value="nam" size="small">Caudal NAM</v-btn>
        <v-btn value="mike11" size="small">Caudal MIKE</v-btn>
        <v-btn value="precipitacion" size="small">Precipitaciones</v-btn>
      </template>
    </v-btn-toggle>

    <v-btn-toggle
      v-model="selectedDataSource"
      mandatory
      density="compact"
      divided
      variant="flat"
      color="primary"
      rounded="lg"
      elevation="4"
      class="bg-primary"
    >
      <v-btn value="observado" size="small">Observado</v-btn>
      <v-btn value="harmonie" size="small">Harmonie</v-btn>
      <v-btn value="epsmedio" size="small">EPS Medio</v-btn>
    </v-btn-toggle>
  </div>
</template>

<script setup lang="ts">
  import { computed, watch } from 'vue'
  import { useMapDataSourceStore } from '@/stores/mapDataSourceStore'
  import { useMapModelStore } from '@/stores/mapModelStore'

  const dataSourceStore = useMapDataSourceStore()
  const modelStore = useMapModelStore()

  const selectedDataSource = computed({
    get: () => dataSourceStore.selectedDataSource,
    set: (v) => {
      dataSourceStore.selectedDataSource = v
    },
  })
  const selectedModel = computed({
    get: () => modelStore.selectedModel,
    set: (v) => {
      modelStore.selectedModel = v
    },
  })

  // The model toggle's button set changes with the data source (Observado
  // only has Caudal/Precipitación, no NAM vs MIKE11 split) — keep the
  // selection valid for whichever set is currently shown instead of
  // leaving it pointing at a button that no longer exists.
  watch(selectedDataSource, (source) => {
    if (
      source === 'observado' &&
      (selectedModel.value === 'nam' || selectedModel.value === 'mike11')
    ) {
      selectedModel.value = 'caudal'
    } else if (source !== 'observado' && selectedModel.value === 'caudal') {
      selectedModel.value = 'nam'
    }
  })
</script>

<style scoped>
  .map-data-source-toggle {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 16px;
  }
</style>
