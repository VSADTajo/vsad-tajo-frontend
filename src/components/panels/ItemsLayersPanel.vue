<template>
  <div class="d-flex flex-column">
    <v-row class="flex-grow-1">
      <v-col cols="12">
        <h2 class="pl-4 pt-4">Capas</h2>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" class="pb-1">
        <ItemsLayersGroup :layers="zonasLayers" title="Zonas" :multiple="false" />
      </v-col>
      <v-col cols="12" class="pt-1">
        <ItemsLayersGroup :layers="stationLayers" title="Estaciones" :multiple="true" />
      </v-col>
      <!-- <v-col cols="12">
        <ItemsLayersGroup :layers="layers" title="Capas Raster" />
      </v-col>
      <v-col cols="12">
        <ItemsLayersGroup :layers="layers" title="Capas EFAS" />
      </v-col> -->
    </v-row>
  </div>
</template>

<script lang="ts" setup>
  import ItemsLayersGroup from '../itemslayers/ItemsLayersGroup.vue'

  import { stationLayers, zonasLayers } from '@/constants/itemsLayers'
</script>
