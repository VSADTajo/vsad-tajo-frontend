<template>
  <v-card class="bg-surface" elevation="2">
    <v-card-title class="text-subtitle-1 font-weight-bold">Ultimos datos observados</v-card-title>
    <v-divider />
    <v-card-text>
      <v-row>
        <v-col cols="6" class="text-caption text-medium-emphasis">Fecha y hora</v-col>
        <v-col cols="6" class="text-right font-weight-medium">
          {{ lastObservedData.datetime }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="6" class="text-caption text-medium-emphasis">Caudal</v-col>
        <v-col cols="6" class="text-right font-weight-medium">
          {{ lastObservedData.flow }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="6" class="text-caption text-medium-emphasis">Nivel</v-col>
        <v-col cols="6" class="text-right font-weight-medium">
          {{ lastObservedData.level }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="6" class="text-caption text-medium-emphasis">Precipitacion acumulada</v-col>
        <v-col cols="6" class="text-right font-weight-medium">
          {{ lastObservedData.rain }}
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'

  const lastObservedData = ref({
    datetime: '15/04/2026 09:00',
    flow: '38.6 m3/s',
    level: '1.42 m',
    rain: '3.4 mm',
  })
</script>
