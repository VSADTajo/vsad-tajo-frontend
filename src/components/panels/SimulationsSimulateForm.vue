<template>
  <v-card variant="outlined" class="mx-3 bg-surface">
    <v-card-item class="pb-2 d-flex">
      <v-card-title class="text-body-2 font-weight-medium">{{ embalse.name }}</v-card-title>
      <v-card-subtitle class="text-caption">{{ embalse.stationCode }}</v-card-subtitle>
    </v-card-item>

    <v-card-text class="d-flex flex-column gap-3 pt-2">
      <v-text-field
        v-model="fechaInicio"
        label="Fecha de inicio"
        type="datetime-local"
        variant="outlined"
        density="compact"
        hide-details
      />

      <v-text-field
        v-model="fechaFin"
        label="Fecha de fin"
        type="datetime-local"
        variant="outlined"
        density="compact"
        class="pt-4"
        hide-details
      />

      <v-text-field
        v-model.number="caudalSalida"
        label="Caudal de salida"
        type="number"
        suffix="m³/s"
        variant="outlined"
        density="compact"
        class="pt-4"
        hide-details
        min="0"
      />
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-btn color="success" variant="flat" block @click="onSimulate">
        <v-icon start>mdi-plus</v-icon>
        Añadir
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import type { StationByCodeResponse } from '@/services/general'

  const props = defineProps<{
    embalse: StationByCodeResponse
  }>()

  const emit = defineEmits<{
    simulate: [
      payload: { code: string; caudalSalida: number | null; fechaInicio: string; fechaFin: string },
    ]
  }>()

  const caudalSalida = ref<number | null>(null)
  const fechaInicio = ref('')
  const fechaFin = ref('')

  function onSimulate() {
    emit('simulate', {
      code: props.embalse.stationCode,
      caudalSalida: caudalSalida.value,
      fechaInicio: fechaInicio.value,
      fechaFin: fechaFin.value,
    })
  }
</script>
