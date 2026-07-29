<template>
  <StationStickyHeader
    :feature="feature"
    :loading="false"
    :header-style="headerStyle"
    @close="closeDrawer"
  />

  <v-alert v-if="!station" type="warning" variant="tonal" class="ma-2">
    Estación no encontrada en el archivo cargado.
  </v-alert>

  <div v-else class="bg-surface">
    <ContentLocalFileHidrograma
      :is-embalse="isEmbalse"
      :thresholds="feature?.properties as Record<string, unknown>"
      :predictions="station.predictions"
    />
  </div>
</template>

<script lang="ts" setup>
  import { computed, onUnmounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useLocalFileStore } from '@/stores/localFileStore'
  import { getSaihTypeColor } from '@/utils/saihStations'
  import { stationsToGeoJSON } from '@/utils/stationsToGeoJSON'
  import StationStickyHeader from './StationStickyHeader.vue'
  import ContentLocalFileHidrograma from './ContentLocalFileHidrograma.vue'

  const route = useRoute()
  const router = useRouter()
  const localFileStore = useLocalFileStore()

  const stationCode = computed(() => route.query.localStation as string | undefined)

  const station = computed(() =>
    localFileStore.stations.find((s) => s.stationCode === stationCode.value)
  )

  const feature = computed<GeoJSON.Feature | null>(() => {
    if (!station.value) return null
    return stationsToGeoJSON([station.value]).features[0] ?? null
  })

  const isEmbalse = computed(() => station.value?.tipoCod === 'E')

  const headerStyle = computed(() => {
    const base = getSaihTypeColor(station.value?.tipoCod ?? undefined)
    return { background: `linear-gradient(135deg, ${base} 0%, #455a64 100%)` }
  })

  function closeDrawer(): void {
    localFileStore.selectStation(null)

    if (!route.query.localStation) return

    const query = { ...route.query }
    delete query.localStation
    router.replace({ query })
  }

  onUnmounted(() => {
    localFileStore.selectStation(null)
  })
</script>
