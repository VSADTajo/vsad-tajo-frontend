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
    <right-content-card v-if="station" />
    <RightContentReporting v-if="reporting" />
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
  import { computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import RightContentCard from './RightContentCard.vue'
  import RightContentReporting from './RightContentReporting.vue'

  const route = useRoute()
  const router = useRouter()
  const { mdAndUp, width } = useDisplay()

  // station seleccionada
  const station = computed(() => route.query.station as string | undefined)

  // reporting seleccionada
  const reporting = computed(() => route.query.reportingPoint as string | undefined)

  // drawer abierto si hay station
  const drawerOpen = computed(() => !!station.value || !!reporting.value)

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
