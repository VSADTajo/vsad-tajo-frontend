<template>
  <v-card class="bg-surface" elevation="2">
    <v-card-title class="text-subtitle-1 font-weight-bold">Ultimas predicciones</v-card-title>
    <v-divider />
    <v-card-text>
      <v-row>
        <v-col cols="6" class="text-caption text-medium-emphasis">Emision</v-col>
        <v-col cols="6" class="text-right font-weight-medium">
          {{ latestPredictionData.issuedAt }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="6" class="text-caption text-medium-emphasis">Horizonte</v-col>
        <v-col cols="6" class="text-right font-weight-medium">
          {{ latestPredictionData.horizon }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="6" class="text-caption text-medium-emphasis">Caudal previsto</v-col>
        <v-col cols="6" class="text-right font-weight-medium">
          {{ latestPredictionData.flowForecast }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="6" class="text-caption text-medium-emphasis">Precipitacion prevista</v-col>
        <v-col cols="6" class="text-right font-weight-medium">
          {{ latestPredictionData.rainForecast }}
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'

  const latestPredictionData = ref({
    issuedAt: '15/04/2026 06:00',
    horizon: 'Proximas 24 h',
    flowForecast: '41.8 m3/s',
    rainForecast: '6.2 mm',
  })
</script>
