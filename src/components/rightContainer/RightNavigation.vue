<template>
  <v-navigation-drawer
    :model-value="drawerOpen"
    class="bg-background"
    location="right"
    :width="drawerWidth"
    transition="slide-x-reverse-transition"
    :scrim="true"
    temporary
    @update:model-value="onDrawerChange"
  >
    <RightContentSimulationEmbalse v-if="station && route.name === 'simulaciones'" />
    <RightContentSaih v-else-if="station" />
    <RightContentLocalFileStation v-if="localStation" />
    <RightContentReporting v-if="reporting" />
    <RightContentByAreaService v-if="subcuenca" kind="subcuenca" />
    <RightContentByAreaService v-if="sistema" kind="sistema" />
    <RightContentByAreaService v-if="zona" kind="zona" />
    <RightContentByAreaService v-if="comarca" kind="comarca" />
    <RightContentByAreaService v-if="meteoalerta" kind="meteoalerta" />
    <RightContentPrecipitacion v-if="precipitacion" />
    <RightContentAviso v-if="aviso" />
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
  import { computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { useNavigation } from '@/composables/useNavigation'
  import RightContentSaih from './RightContentSaih.vue'
  import RightContentSimulationEmbalse from './RightContentSimulationEmbalse.vue'
  import RightContentReporting from './RightContentReporting.vue'
  import RightContentByAreaService from './RightContentByAreaService.vue'
  import RightContentPrecipitacion from './RightContentPrecipitacion.vue'
  import RightContentAviso from './RightContentAviso.vue'
  import RightContentLocalFileStation from './RightContentLocalFileStation.vue'

  const route = useRoute()
  const router = useRouter()
  const { mdAndUp, width } = useDisplay()
  const { drawerOpen: leftMenuOpen } = useNavigation()

  const station = computed(() => route.query.station as string | undefined)

  const localStation = computed(() => route.query.localStation as string | undefined)

  const reporting = computed(() => route.query.reportingPoint as string | undefined)

  const subcuenca = computed(() => route.query.subcuenca as string | undefined)

  const sistema = computed(() => route.query.sistema as string | undefined)

  const zona = computed(() => route.query.zona as string | undefined)

  const comarca = computed(() => route.query.comarca as string | undefined)

  const meteoalerta = computed(() => route.query.meteoalerta as string | undefined)

  const precipitacion = computed(() => route.query.precipitacion as string | undefined)

  const aviso = computed(() => route.query.aviso as string | undefined)

  // drawer abierto si hay station
  const drawerOpen = computed(
    () =>
      !!station.value ||
      !!localStation.value ||
      !!reporting.value ||
      !!subcuenca.value ||
      !!sistema.value ||
      !!zona.value ||
      !!comarca.value ||
      !!meteoalerta.value ||
      !!precipitacion.value ||
      !!aviso.value
  )

  // ignorar cierre inmediato por scrim
  let ignoreNextClose = false

  watch(station, (val, oldVal) => {
    if (val && !oldVal) {
      ignoreNextClose = true
      setTimeout(() => (ignoreNextClose = false), 150)
    }
  })

  watch(localStation, (val, oldVal) => {
    if (val && !oldVal) {
      ignoreNextClose = true
      setTimeout(() => (ignoreNextClose = false), 150)
    }
  })

  watch(aviso, (val, oldVal) => {
    if (val && !oldVal) {
      ignoreNextClose = true
      setTimeout(() => (ignoreNextClose = false), 150)
    }
  })

  // Toggling SecondaryDrawer changes drawerWidth above, which Vuetify's
  // navigation-drawer can report back through update:model-value as if the
  // drawer itself had been closed — it should only resize/shift, never
  // close, so swallow that one spurious emission.
  watch(leftMenuOpen, () => {
    ignoreNextClose = true
    setTimeout(() => (ignoreNextClose = false), 350)
  })

  function onDrawerChange(val: boolean) {
    if (!val && !ignoreNextClose) {
      const queryObj = { ...route.query }
      delete queryObj.station
      delete queryObj.localStation
      delete queryObj.aviso
      router.replace({ query: queryObj })
    }
  }

  // Must match DesktopRail.vue's `width="72"` and SecondaryDrawer.vue's
  // `width="320"` — the chart drawer's left edge lines up with whichever of
  // those is currently the leftmost visible one, instead of a fixed ratio
  // of the window that ignored their actual widths.
  const DESKTOP_RAIL_WIDTH = 72
  const SECONDARY_DRAWER_WIDTH = 320

  // ancho responsive
  const drawerWidth = computed(() => {
    if (!mdAndUp.value) return width.value
    const reserved = leftMenuOpen.value
      ? DESKTOP_RAIL_WIDTH + SECONDARY_DRAWER_WIDTH
      : DESKTOP_RAIL_WIDTH
    return width.value - reserved
  })
</script>
