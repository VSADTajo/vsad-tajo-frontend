<template>
  <div class="simulations-container">
    <div class="simulations-header">
      <v-row>
        <v-col cols="12" class="d-flex align-center justify-space-between">
          <h2 class="pl-4 pt-4">Simulaciones</h2>
          <v-btn icon class="mr-4 mt-4" color="primary" density="comfortable" @click="goBack">
            <v-icon>{{ mdAndUp ? 'mdi-arrow-left' : 'mdi-arrow-down' }}</v-icon>
          </v-btn>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12">
          <v-divider></v-divider>
        </v-col>
        <v-col cols="12" class="pt-2 pb-2">
          <v-autocomplete
            v-model="selectedCode"
            v-model:search="searchText"
            :items="autocompleteItems"
            item-title="title"
            item-value="value"
            clearable
            label="Buscar Embalse"
            variant="outlined"
            bg-color="variant"
            hide-details
            class="px-3"
            density="compact"
            rounded
            prepend-inner-icon="mdi-magnify"
            no-filter
          />
        </v-col>
        <v-col cols="12">
          <p class="pl-4 font-weight-medium">Embalses</p>
        </v-col>
        <v-col cols="12">
          <SimulationsEmbalseList
            :embalses="embalses"
            :filter="searchText"
            :loading="loading"
            :selected-code="selectedCode ?? undefined"
            class="simulations-list"
            @select="selectedCode = $event ?? null"
            @open="openDetail"
            @fly-to="flyToEmbalse"
          />
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, onUnmounted, ref, computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { getStationByCodeService, type StationByCodeResponse } from '@/services/general'
  import { embalsesWithCaudalPredictions } from '@/constants/predictionsAvailableData'
  import { useLayersStore } from '@/stores/layersStore'
  import { useMapStore } from '@/stores/mapStore'
  import SimulationsEmbalseList from './SimulationsEmbalseList.vue'

  const { mdAndUp } = useDisplay()
  const route = useRoute()
  const router = useRouter()
  const layersStore = useLayersStore()
  const mapStore = useMapStore()

  const loading = ref(true)
  const embalses = ref<StationByCodeResponse[]>([])
  const selectedCode = ref<string | null>(null)
  const searchText = ref('')

  const autocompleteItems = computed(() =>
    embalses.value.map((e) => ({ title: e.name, value: e.stationCode }))
  )

  onMounted(async () => {
    layersStore.applySimulationsPreset()
    try {
      const results = await Promise.all(
        embalsesWithCaudalPredictions.map((code) => getStationByCodeService(code))
      )
      embalses.value = results
    } finally {
      loading.value = false
    }
  })

  onUnmounted(() => {
    layersStore.resetStationLayers()
  })

  function openDetail(code: string) {
    router.replace({ query: { ...route.query, station: code } })
  }

  function flyToEmbalse(code: string) {
    const embalse = embalses.value.find((e) => e.stationCode === code)
    if (embalse?.latitude != null && embalse?.longitude != null) {
      mapStore.requestFlyTo(embalse.latitude, embalse.longitude, { zoom: 13 })
    }
  }

  function goBack() {
    router.push('/')
  }
</script>

<style scoped>
  .simulations-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .simulations-header {
    flex-shrink: 0;
  }

  .simulations-list {
    flex: 1 1 0;
    min-height: 0;
    padding-bottom: 24px;
  }
</style>
