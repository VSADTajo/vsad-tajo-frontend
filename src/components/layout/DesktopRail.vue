<template>
  <v-navigation-drawer permanent rail width="72" color="primary" class="d-flex flex-column">
    <!-- PARTE SUPERIOR -->
    <v-row class="h-100" no-gutters>
      <v-list nav class="d-flex flex-column flex-grow-1">
        <v-list-item
          prepend-icon="mdi-layers"
          :active="activeSection === 'capas'"
          @click="toggleSection('capas')"
        />

        <v-list-item
          v-if="hasRole('admin')"
          prepend-icon="mdi-tune-variant"
          :active="activeSection === 'simulaciones'"
          @click="toggleSection('simulaciones')"
        />
      </v-list>

      <!-- PARTE INFERIOR -->
      <v-list nav class="d-flex flex-column flex-grow-0 justify-end">
        <v-list-item
          prepend-icon="mdi-map"
          :active="activeSection === 'mapasbase'"
          @click="toggleSection('mapasbase')"
        />
      </v-list>
    </v-row>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
  import { useNavigation } from '@/composables/useNavigation'
  import { useAuth } from '@/composables/useAuth'

  const { activeSection, toggleSection } = useNavigation()
  const { hasRole } = useAuth()
</script>
