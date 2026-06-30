<template>
  <v-dialog v-model="open" max-width="480" @click:outside="!saving && (open = false)">
    <v-card>
      <v-card-title class="text-subtitle-1 pt-4 px-4 bg-primary">Editar Simulación</v-card-title>
      <v-card-text class="px-4 pt-2 pb-0">
        <div v-for="(m, i) in edited" :key="m.id">
          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-body-2 font-weight-medium">{{ m.reservoirCode }}</span>
            <span class="text-caption text-medium-emphasis">
              Caudal de Salida: {{ m.outputFlowValue }} m³/s
            </span>
          </div>
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="m.startDate"
                label="Fecha inicio"
                type="date"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="m.endDate"
                label="Fecha fin"
                type="date"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
          </v-row>
          <v-divider v-if="i < edited.length - 1" class="my-4" />
        </div>
      </v-card-text>
      <v-card-actions class="px-4 pb-4 pt-4">
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="open = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="onSave">Editar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  import { ref, watch } from 'vue'
  import type { SimulationRecord } from '@/types/Simulations'
  import { updateSimulationService } from '@/services/general'

  const props = defineProps<{
    modelValue: boolean
    sim: SimulationRecord
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    saved: []
  }>()

  const open = ref(props.modelValue)
  const saving = ref(false)

  watch(
    () => props.modelValue,
    (val) => {
      open.value = val
      if (val) resetEdited()
    }
  )

  watch(open, (val) => emit('update:modelValue', val))

  type EditedManeuver = {
    id: string
    reservoirCode: string
    outputFlowValue: number
    startDate: string
    endDate: string
  }

  const edited = ref<EditedManeuver[]>([])

  function resetEdited() {
    edited.value = props.sim.maneuvers.map((m) => ({
      id: m.id,
      reservoirCode: m.reservoirCode,
      outputFlowValue: m.outputFlowValue,
      startDate: toDateInput(m.startDate),
      endDate: toDateInput(m.endDate),
    }))
  }

  function toDateInput(iso: string | null): string {
    if (!iso) return ''
    return iso.substring(0, 10)
  }

  async function onSave() {
    saving.value = true
    try {
      await updateSimulationService(
        props.sim.id,
        edited.value.map((m) => ({
          id: m.id,
          startDate: m.startDate ? new Date(m.startDate).toISOString() : null,
          endDate: m.endDate ? new Date(m.endDate).toISOString() : null,
        }))
      )
      open.value = false
      emit('saved')
    } finally {
      saving.value = false
    }
  }
</script>
