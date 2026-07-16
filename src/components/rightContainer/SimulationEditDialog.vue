<template>
  <v-dialog v-model="open" max-width="520" @click:outside="!saving && (open = false)">
    <v-card>
      <v-card-title class="text-subtitle-1 pt-4 px-4 bg-primary">Editar Simulación</v-card-title>
      <v-card-text class="px-4 pt-4 pb-0">
        <div v-for="(m, i) in edited" :key="m.id">
          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-body-2 font-weight-medium">{{ m.reservoirCode }}</span>
            <span class="text-caption text-medium-emphasis">
              Caudal de Salida: {{ m.outputFlowValue }} m³/s
            </span>
          </div>

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis mb-1">Fecha de inicio</div>
            <VueDatePicker
              v-model="m.startDate"
              :min-date="dialogNow"
              :enable-time-picker="true"
              :minutes-increment="5"
              time-picker-inline
              :locale="es"
              :format="formatDateDDMMYYYY"
              placeholder="Seleccionar fecha de inicio"
              auto-apply
              teleport="body"
              :class="startError(m) ? 'dp--error' : ''"
              @update:model-value="onStartChange(i)"
            />
            <div v-if="startError(m)" class="text-caption text-error mt-1">
              La fecha de inicio no puede ser anterior a ahora
            </div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis mb-1">Fecha de fin</div>
            <VueDatePicker
              v-model="m.endDate"
              :min-date="minEndDate(i)"
              :enable-time-picker="true"
              :minutes-increment="5"
              time-picker-inline
              :locale="es"
              :format="formatDateDDMMYYYY"
              placeholder="Seleccionar fecha de fin"
              auto-apply
              teleport="body"
              :class="endError(m) ? 'dp--error' : ''"
            />
            <div v-if="endError(m)" class="text-caption text-error mt-1">
              <span v-if="m.endDate && m.startDate && m.endDate <= m.startDate">
                La fecha de fin debe ser posterior al inicio
              </span>
              <span v-else>La fecha de fin no puede ser anterior a ahora</span>
            </div>
          </div>

          <v-divider v-if="i < edited.length - 1" class="my-4" />
        </div>
      </v-card-text>
      <v-card-actions class="px-4 pb-4 pt-4">
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="open = false">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="!isValid"
          @click="onSave"
        >
          Editar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue'
  import { VueDatePicker } from '@vuepic/vue-datepicker'
  import '@vuepic/vue-datepicker/dist/main.css'
  import { es } from 'date-fns/locale'
  import type { SimulationRecord } from '@/types/Simulations'
  import { createSimulationService, deleteSimulationService } from '@/services/simulations'
  import { formatDateDDMMYYYY } from '@/utils/dates'

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
  let dialogNow = new Date()

  function nextMultipleOf5(date: Date): Date {
    const result = new Date(date)
    const m = result.getMinutes()
    const remainder = m % 5
    result.setMinutes(remainder === 0 ? m + 5 : m + (5 - remainder), 0, 0)
    return result
  }

  watch(
    () => props.modelValue,
    (val) => {
      open.value = val
      if (val) {
        dialogNow = nextMultipleOf5(new Date())
        resetEdited()
      }
    }
  )

  watch(open, (val) => emit('update:modelValue', val))

  type EditedManeuver = {
    id: string
    reservoirCode: string
    outputFlowValue: number
    startDate: Date | null
    endDate: Date | null
  }

  const edited = ref<EditedManeuver[]>([])

  function resetEdited() {
    edited.value = props.sim.maneuvers.map((m) => ({
      id: m.id,
      reservoirCode: m.reservoirCode,
      outputFlowValue: m.outputFlowValue,
      startDate: m.startDate ? new Date(m.startDate) : null,
      endDate: m.endDate ? new Date(m.endDate) : null,
    }))
  }

  function minEndDate(index: number): Date {
    const start = edited.value[index]?.startDate
    if (!start) return dialogNow
    const d = new Date(start)
    d.setMinutes(d.getMinutes() + 5, 0, 0)
    return d
  }

  function onStartChange(index: number) {
    const m = edited.value[index]
    if (!m) return
    if (m.endDate && m.startDate && m.endDate <= m.startDate) {
      m.endDate = null
    }
  }

  function startError(m: EditedManeuver): boolean {
    return m.startDate != null && m.startDate < dialogNow
  }

  function endError(m: EditedManeuver): boolean {
    if (m.endDate == null) return false
    if (m.startDate && m.endDate <= m.startDate) return true
    return m.endDate < dialogNow
  }

  const isValid = computed(
    () =>
      edited.value.length > 0 &&
      edited.value.every(
        (m) => m.startDate != null && m.endDate != null && !startError(m) && !endError(m)
      )
  )

  async function onSave() {
    if (!isValid.value) return
    saving.value = true
    try {
      await deleteSimulationService(props.sim.id)
      await createSimulationService({
        modmeteo: 'BOTH',
        description: props.sim.description || undefined,
        maneuvers: edited.value.map((m) => ({
          reservoirCode: m.reservoirCode,
          outputFlowValue: m.outputFlowValue,
          startDate: m.startDate!.toISOString(),
          endDate: m.endDate!.toISOString(),
        })),
      })
      open.value = false
      emit('saved')
    } finally {
      saving.value = false
    }
  }
</script>

<style>
  .dp__theme_light {
    --dp-primary-color: rgb(var(--v-theme-primary));
    --dp-primary-text-color: #fff;
    --dp-border-color: rgba(var(--v-border-color), var(--v-border-opacity));
    --dp-border-radius: 4px;
    --dp-font-size: 0.875rem;
  }

  .dp--error .dp__input {
    border-color: rgb(var(--v-theme-error));
    color: rgb(var(--v-theme-error));
  }
</style>
