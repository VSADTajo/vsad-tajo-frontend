<template>
  <v-card variant="outlined" class="mx-3 bg-surface">
    <v-card-item class="pb-1">
      <v-card-title class="text-body-1 font-weight-medium d-flex align-center gap-2">
        Operaciones
        <v-chip v-if="operations.length" size="x-small" color="primary" class="ml-1">
          {{ operations.length }}
        </v-chip>
      </v-card-title>
    </v-card-item>

    <v-card-text class="pa-0">
      <v-expansion-panels v-if="operations.length" variant="accordion" flat>
        <v-expansion-panel v-for="(op, i) in operations" :key="i" elevation="0">
          <v-expansion-panel-title density="compact" class="text-body-2 px-3">
            <div class="d-flex align-center gap-2 w-100 overflow-hidden justify-space-between">
              <span class="font-weight-medium text-truncate">{{ op.stationName }}</span>
              <v-chip size="x-small" variant="tonal" class="flex-shrink-0">
                {{ op.stationCode }}
              </v-chip>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text class="px-1">
            <div class="text-caption d-flex flex-column gap-1 mb-3">
              <div>
                <span class="text-medium-emphasis">Inicio:</span>
                {{ formatDateDDMMYYYY(op.fechaInicio) }}
              </div>
              <div>
                <span class="text-medium-emphasis">Fin:</span>
                {{ formatDateDDMMYYYY(op.fechaFin) }}
              </div>
              <div>
                <span class="text-medium-emphasis">Caudal salida:</span>
                {{ op.caudalSalida }} m&#xB3;/s
              </div>
            </div>
            <div class="d-flex gap-4 justify-space-between">
              <v-btn variant="tonal" color="primary" size="small" @click="emit('edit', i)">
                <v-icon start size="14">mdi-pencil-outline</v-icon>
                Editar
              </v-btn>
              <v-btn variant="tonal" color="error" size="small" @click="emit('delete', i)">
                <v-icon start size="14">mdi-trash-can-outline</v-icon>
                Eliminar
              </v-btn>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <div v-else class="text-caption text-medium-emphasis text-center py-4">
        No hay operaciones añadidas
      </div>
    </v-card-text>

    <v-card-actions class="px-4 pb-4 pt-2">
      <v-btn
        color="primary"
        variant="flat"
        block
        :disabled="!operations.length"
        :loading="loading"
        @click="emit('create-simulation')"
      >
        <v-icon start>mdi-send-outline</v-icon>
        Crear simulación
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts" setup>
  import type { SimulationOperation } from '@/types/Simulations'
  import { formatDateDDMMYYYY } from '@/utils/dates'

  defineProps<{
    operations: SimulationOperation[]
    loading?: boolean
  }>()

  const emit = defineEmits<{
    edit: [index: number]
    delete: [index: number]
    'create-simulation': []
  }>()
</script>
