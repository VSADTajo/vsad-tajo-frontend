<template>
  <v-app-bar flat color="primary" class="px-4" app :location="mdAndUp ? 'top' : 'bottom'">
    <!-- BOTÓN MOBILE -->
    <mobile-navigation-menu v-if="!mdAndUp" />

    <v-toolbar-title class="text-h6 font-weight-bold">VSAD Tajo</v-toolbar-title>

    <v-autocomplete
      v-if="mdAndUp"
      clearable
      label="Búsqueda por Estacion, Subcuenca o Zona"
      variant="outlined"
      hide-details
      density="compact"
      rounded
      prepend-inner-icon="mdi-magnify"
    ></v-autocomplete>

    <v-spacer />

    <UserMenu />
  </v-app-bar>
</template>

<script setup lang="ts">
  import { useDisplay } from 'vuetify'
  import UserMenu from '@/components/basics/UserMenu.vue'
  import MobileNavigationMenu from './mobile/MobileNavigationMenu.vue'

  const { mdAndUp } = useDisplay()
</script>

<style lang="scss" scoped></style>
