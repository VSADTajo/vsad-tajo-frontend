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
    <ForecastChartNew :data="chartData" :height="470" />
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useLocalFileStore } from '@/stores/localFileStore'
  import { getSaihTypeColor } from '@/utils/saihStations'
  import StationStickyHeader from './StationStickyHeader.vue'
  import ForecastChartNew from '../charts/ForecastChartNew.vue'

  const route = useRoute()
  const router = useRouter()
  const localFileStore = useLocalFileStore()

  const stationCode = computed(() => route.query.localStation as string | undefined)

  const station = computed(() =>
    localFileStore.stations.find((s) => s.stationCode === stationCode.value)
  )

  const feature = computed<GeoJSON.Feature | null>(() => {
    if (!station.value) return null

    return {
      type: 'Feature',
      id: station.value.id,
      geometry: {
        type: 'Point',
        coordinates: [station.value.longitude ?? 0, station.value.latitude ?? 0],
      },
      properties: {
        codigo: station.value.stationCode,
        nombre: station.value.name,
        tipo_cod: station.value.tipoCod ?? null,
        stationType: station.value.stationType,
        municipio: station.value.municipio,
        provincia: station.value.provincia,
        ccaa: station.value.ccaa,
      },
    }
  })

  const headerStyle = computed(() => {
    const base = getSaihTypeColor(station.value?.tipoCod ?? undefined)
    return { background: `linear-gradient(135deg, ${base} 0%, #455a64 100%)` }
  })

  const chartData = computed(() => ({
    historical: station.value?.predictions?.historical,
    forecastHarmonie: station.value?.predictions?.forecastHarmonie,
    forecastEpsat: station.value?.predictions?.forecastEpsat,
    forecastEnsP10: station.value?.predictions?.forecastEnsP10,
    forecastEnsP25: station.value?.predictions?.forecastEnsP25,
    forecastEnsP75: station.value?.predictions?.forecastEnsP75,
    forecastEnsP90: station.value?.predictions?.forecastEnsP90,
  }))

  function closeDrawer(): void {
    if (!route.query.localStation) return

    const query = { ...route.query }
    delete query.localStation
    router.replace({ query })
  }
</script>
