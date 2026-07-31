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

  <template v-else>
    <v-sheet v-if="hasCaudal && hasPrecipitacion" elevation="2" class="mt-2">
      <v-tabs v-model="tab" color="primary">
        <v-tab value="caudal">Hidrogramas</v-tab>
        <v-tab value="precipitaciones">Precipitaciones</v-tab>
      </v-tabs>
    </v-sheet>

    <div v-if="tab === 'caudal'" class="bg-surface">
      <ContentLocalFileHidrograma
        :is-embalse="isEmbalse"
        :thresholds="feature?.properties as Record<string, unknown>"
        :predictions="station.predictions"
      />
    </div>

    <div v-else class="bg-surface">
      <ContentLocalFilePrecipitaciones
        :thresholds="feature?.properties as Record<string, unknown>"
        :predictions="station.predictions"
      />
    </div>
  </template>
</template>

<script lang="ts" setup>
  import { computed, onUnmounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useLocalFileStore } from '@/stores/localFileStore'
  import { getSaihTypeColor } from '@/utils/saihStations'
  import { stationsToGeoJSON } from '@/utils/stationsToGeoJSON'
  import StationStickyHeader from './StationStickyHeader.vue'
  import ContentLocalFileHidrograma from './ContentLocalFileHidrograma.vue'
  import ContentLocalFilePrecipitaciones from './ContentLocalFilePrecipitaciones.vue'

  const route = useRoute()
  const router = useRouter()
  const localFileStore = useLocalFileStore()

  const stationCode = computed(() => route.query.localStation as string | undefined)

  const station = computed(() =>
    localFileStore.stations.find((s) => s.stationCode === stationCode.value)
  )

  const feature = computed<GeoJSON.Feature | null>(() => {
    if (!station.value) return null
    const base = stationsToGeoJSON([station.value]).features[0]
    if (!base) return null

    // StationStickyHeader reads `codigo`/`nombre`/`tipo`, which the generic
    // stationsToGeoJSON() (built for the map layer) doesn't set.
    return {
      ...base,
      properties: {
        ...base.properties,
        codigo: station.value.stationCode,
        nombre: station.value.name,
        tipo: 'SAIH',
      },
    }
  })

  const isEmbalse = computed(() => station.value?.tipoCod === 'E')

  const headerStyle = computed(() => {
    const base = getSaihTypeColor(station.value?.tipoCod ?? undefined)
    return { background: `linear-gradient(135deg, ${base} 0%, #455a64 100%)` }
  })

  // A station's own predictions decide which tabs make sense — a precip
  // station (P_xx) will only ever carry P.* series, an aforo/embalse only
  // Q./I./V.*, so this stays correct as later phases add more files.
  const predictionTypeNames = computed(() =>
    Object.values(station.value?.predictions ?? {}).map((p) => p?.predictionTypeName ?? '')
  )
  const hasCaudal = computed(() => predictionTypeNames.value.some((name) => /^[QIV]\./.test(name)))
  const hasPrecipitacion = computed(() =>
    predictionTypeNames.value.some((name) => name.startsWith('P.'))
  )

  const tab = ref<'caudal' | 'precipitaciones'>('caudal')

  watch(
    station,
    (s) => {
      if (!s) return
      tab.value = hasCaudal.value ? 'caudal' : 'precipitaciones'
    },
    { immediate: true }
  )

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
