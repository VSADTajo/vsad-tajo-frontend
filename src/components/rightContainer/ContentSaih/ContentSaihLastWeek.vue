<template>
  <v-card class="bg-surface" elevation="2">
    <v-card-title class="text-subtitle-1 font-weight-bold">Resumen ultima semana</v-card-title>
    <v-divider />
    <v-card-text>
      <v-row>
        <v-col cols="7" class="text-caption text-medium-emphasis">Caudal minimo</v-col>
        <v-col cols="5" class="text-right font-weight-medium">
          {{ weeklySummary.minFlow }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="7" class="text-caption text-medium-emphasis">Caudal maximo</v-col>
        <v-col cols="5" class="text-right font-weight-medium">
          {{ weeklySummary.maxFlow }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="7" class="text-caption text-medium-emphasis">Caudal medio</v-col>
        <v-col cols="5" class="text-right font-weight-medium">
          {{ weeklySummary.avgFlow }}
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="7" class="text-caption text-medium-emphasis">Periodo</v-col>
        <v-col cols="5" class="text-right font-weight-medium">
          {{ weeklySummary.period }}
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'

  const weeklySummary = ref({
    minFlow: '38.6 m3/s',
    maxFlow: '42.1 m3/s',
    avgFlow: '40.3 m3/s',
    period: '08/04/2026 - 15/04/2026',
  })
</script>
