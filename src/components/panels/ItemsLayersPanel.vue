<template>
  <div class="d-flex flex-column">
    <v-row class="flex-grow-1">
      <v-col cols="12">
        <h2 class="pl-4 pt-4">Capas</h2>
      </v-col>
      <v-divider></v-divider>
    </v-row>
    <v-row>
      <v-col cols="12" class="pb-1 px-4">
        <ItemsLayersGroup
          :layers="zonasLayers"
          title="Zonas"
          :multiple="false"
          :default-open="false"
        />
      </v-col>
      <v-col cols="12" class="pt-1 pb-1 px-4">
        <ItemsLayersGroup
          :layers="stationLayers"
          title="Estaciones"
          :multiple="true"
          :default-open="true"
        />
      </v-col>
      <v-col cols="12" class="pt-1 px-4">
        <ItemsLayersGroup
          :layers="efasLayers"
          title="Efas"
          :multiple="false"
          :default-open="false"
        />
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup>
  import ItemsLayersGroup from '../itemslayers/ItemsLayersGroup.vue'

  import { stationLayers, zonasLayers, efasLayers } from '@/constants/itemsLayers'
</script>
