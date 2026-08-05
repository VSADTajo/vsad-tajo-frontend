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
    <v-sheet v-if="hasCaudal || hasPrecipitacion" elevation="2" class="mt-2">
      <v-tabs v-model="tab" color="primary">
        <v-tab v-if="hasCaudal" value="caudal">Hidrogramas</v-tab>
        <v-tab v-if="hasPrecipitacion" value="precipitaciones">Precipitaciones</v-tab>
      </v-tabs>
    </v-sheet>

    <div v-if="tab === 'caudal'" class="bg-surface">
      <ContentLocalFileHidrograma
        :is-embalse="isEmbalse"
        :thresholds="feature?.properties as Record<string, unknown>"
        :predictions="station.predictionsCaudal"
        :volumen-predictions="station.predictionsVolumen"
        :station-code="station.stationCode"
      />
    </div>

    <div v-else class="bg-surface">
      <ContentLocalFilePrecipitaciones
        :thresholds="feature?.properties as Record<string, unknown>"
        :predictions="station.predictionsPrecipitacion"
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
  import { getStationByCodeService, type StationByCodeResponse } from '@/services/general'
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

  // municipio/provincia/ccaa/zona (the StationStickyHeader chips) aren't in
  // the FEWS file at all — they're static station metadata, so fetched live
  // the same way thresholds are, keeping the header on par with
  // RightContentSaih.vue even though the predictions themselves come from file.
  const liveStationMeta = ref<StationByCodeResponse | null>(null)

  watch(
    () => station.value?.stationCode,
    async (code) => {
      liveStationMeta.value = null
      if (!code) return

      try {
        liveStationMeta.value = await getStationByCodeService(code)
      } catch {
        liveStationMeta.value = null
      }
    },
    { immediate: true }
  )

  const feature = computed<GeoJSON.Feature | null>(() => {
    if (!station.value) return null
    const base = stationsToGeoJSON([station.value]).features[0]
    if (!base) return null

    // StationStickyHeader reads `codigo`/`nombre`/`tipo`, which the generic
    // stationsToGeoJSON() (built for the map layer) doesn't set. codigo/
    // nombre/tipo stay authoritative from the file even if the live lookup
    // matched a different-looking record.
    return {
      ...base,
      properties: {
        ...base.properties,
        ...liveStationMeta.value,
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

  // A tab only shows if the station actually carries that kind of prediction
  // (loading a caudal-only file shouldn't surface an empty Precipitaciones
  // tab, and vice versa) — a series with every value masked as missVal still
  // counts, since localFileStore keeps it precisely so this tab stays visible.
  // Volumen lives inside the same "Hidrogramas" tab as caudal (mirrors the
  // live app, where an embalse's caudal and volumen are just two views under
  // one tab), so either one is enough to show it.
  const hasCaudal = computed(
    () =>
      Object.keys(station.value?.predictionsCaudal ?? {}).length > 0 ||
      Object.keys(station.value?.predictionsVolumen ?? {}).length > 0
  )
  const hasPrecipitacion = computed(
    () => Object.keys(station.value?.predictionsPrecipitacion ?? {}).length > 0
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
