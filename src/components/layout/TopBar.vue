<template>
  <v-app-bar flat color="primary" class="px-4" app :location="mdAndUp ? 'top' : 'bottom'">
    <!-- BOTÓN MOBILE -->
    <mobile-navigation-menu v-if="!mdAndUp" />

    <v-toolbar-title class="text-h6 font-weight-bold">
      <div class="d-flex align-center" :class="mdAndUp ? 'flex-row' : 'flex-column justify-center'">
        <v-img
          :src="logo"
          :max-width="mdAndUp ? 100 : 70"
          :width="mdAndUp ? 100 : 70"
          :height="mdAndUp ? 40 : 32"
          class="mr-md-4 mb-1 mb-md-0"
          contain
        />

        <v-img v-if="mdAndUp" :src="ministerio" max-width="300" class="ml-5" contain />
      </div>
    </v-toolbar-title>

    <v-autocomplete
      v-if="mdAndUp"
      color="surface_variant"
      bg-color="surface_variant"
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
  import logo from '@/assets/img/logo_saih-6.png'
  import ministerio from '@/assets/img/logo_espana.png'

  const { mdAndUp } = useDisplay()
</script>

<style lang="scss" scoped></style>
