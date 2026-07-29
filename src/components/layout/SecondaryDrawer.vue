<template>
  <v-navigation-drawer v-model="localOpen" permanent width="320" :mobile="true" color="background">
    <component :is="activeComponent" v-if="activeComponent" />
  </v-navigation-drawer>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useNavigation } from '@/composables/useNavigation'

  import ItemsLayersPanel from '@/components/panels/ItemsLayersPanel.vue'
  import AlertsPanel from '@/components/panels/AlertsPanel.vue'
  import SettingsPanel from '@/components/panels/SettingsPanel.vue'
  import ReportsPanel from '../panels/ReportsPanel.vue'
  import BasemapsPanel from '../panels/BasemapsPanel.vue'
  import SimulationsPanel from '../panels/SimulationsPanel.vue'
  import LocalFilePanel from '../panels/LocalFilePanel.vue'

  const { drawerOpen, activeSection } = useNavigation()

  const activeComponent = computed(() => {
    switch (activeSection.value) {
      case 'capas':
        return ItemsLayersPanel
      case 'avisos':
        return AlertsPanel
      case 'simulaciones':
        return SimulationsPanel
      case 'archivo-local':
        return LocalFilePanel
      case 'informes':
        return ReportsPanel
      case 'mapasbase':
        return BasemapsPanel
      case 'ajustes':
        return SettingsPanel
      default:
        return null
    }
  })

  const localOpen = ref(drawerOpen.value)
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  watch(drawerOpen, (val) => {
    if (!val) {
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }
      localOpen.value = false
    }
  })

  watch(activeSection, (newVal, oldVal) => {
    if (newVal && oldVal && newVal !== oldVal) {
      if (hideTimer) clearTimeout(hideTimer)
      localOpen.value = false
      hideTimer = setTimeout(() => {
        hideTimer = null
        localOpen.value = true
      }, 280)
    } else if (newVal && !oldVal) {
      localOpen.value = true
    }
  })
</script>

<style lang="scss" scoped></style>
