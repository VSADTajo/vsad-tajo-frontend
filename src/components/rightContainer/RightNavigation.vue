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
    <RightContentSaih v-if="station" />
    <RightContentReporting v-if="reporting" />
    <right-content-subcuenca v-if="subcuenca" />
    <RightContentSistemas v-if="sistema" />
    <RightContentZonas v-if="zona" />
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
  import { computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import RightContentSaih from './RightContentSaih.vue'
  import RightContentReporting from './RightContentReporting.vue'
  import RightContentSubcuenca from './RightContentSubcuenca.vue'
  import RightContentSistemas from './RightContentSistemas.vue'
  import RightContentZonas from './RightContentZonas.vue'

  const route = useRoute()
  const router = useRouter()
  const { mdAndUp, width } = useDisplay()

  const station = computed(() => route.query.station as string | undefined)

  const reporting = computed(() => route.query.reportingPoint as string | undefined)

  const subcuenca = computed(() => route.query.subcuenca as string | undefined)

  const sistema = computed(() => route.query.sistema as string | undefined)

  const zona = computed(() => route.query.zona as string | undefined)

  // drawer abierto si hay station
  const drawerOpen = computed(
    () =>
      !!station.value || !!reporting.value || !!subcuenca.value || !!sistema.value || !!zona.value
  )

  // ignorar cierre inmediato por scrim
  let ignoreNextClose = false

  watch(station, (val, oldVal) => {
    if (val && !oldVal) {
      ignoreNextClose = true
      setTimeout(() => (ignoreNextClose = false), 150)
    }
  })

  function onDrawerChange(val: boolean) {
    if (!val && station.value && !ignoreNextClose) {
      const { station, ...query } = route.query
      router.replace({ query })
    }
  }

  // ancho responsive
  const drawerWidth = computed(() => (mdAndUp.value ? width.value * 0.8 : width.value))
</script>
