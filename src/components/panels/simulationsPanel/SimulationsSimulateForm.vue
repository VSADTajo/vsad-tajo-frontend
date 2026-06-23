<template>
  <v-card variant="outlined" class="mx-3 bg-surface">
    <v-card-item class="pb-2 d-flex">
      <v-card-title class="text-body-2 font-weight-medium">{{ embalse.name }}</v-card-title>
      <v-card-subtitle class="text-caption">{{ embalse.stationCode }}</v-card-subtitle>
    </v-card-item>

    <v-card-text class="d-flex flex-column gap-4 pt-2">
      <div>
        <div class="text-caption text-medium-emphasis mb-1">Fecha de inicio</div>
        <VueDatePicker
          v-model="fechaInicio"
          :min-date="defaultStart"
          :enable-time-picker="true"
          :minutes-increment="5"
          time-picker-inline
          :locale="es"
          :format="formatDateDDMMYYYY"
          placeholder="Seleccionar fecha de inicio"
          auto-apply
          teleport="body"
        />
      </div>

      <div class="mt-2">
        <div class="text-caption text-medium-emphasis mb-1">Fecha de fin</div>
        <VueDatePicker
          v-model="fechaFin"
          :min-date="minFechaFin"
          :enable-time-picker="true"
          :minutes-increment="5"
          time-picker-inline
          :locale="es"
          :format="formatDateDDMMYYYY"
          placeholder="Seleccionar fecha de fin"
          auto-apply
          teleport="body"
        />
      </div>

      <v-text-field
        v-model.number="caudalSalida"
        label="Caudal de salida"
        type="number"
        suffix="m³/s"
        variant="outlined"
        density="compact"
        hide-details
        min="0"
        class="mt-4"
        :loading="loadingDefault"
      />
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-btn color="success" variant="flat" block :disabled="!isFormValid" @click="onSubmit">
        <v-icon start>{{ isEditing ? 'mdi-check' : 'mdi-plus' }}</v-icon>
        {{ isEditing ? 'Actualizar' : 'Añadir' }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts" setup>
  import { ref, watch, computed } from 'vue'
  import { VueDatePicker } from '@vuepic/vue-datepicker'
  import '@vuepic/vue-datepicker/dist/main.css'
  import { es } from 'date-fns/locale'
  import type { StationByCodeResponse } from '@/services/general'
  import type { SimulationOperation } from '@/types/Simulations'
  import { formatDateDDMMYYYY } from '@/utils/dates'
  import { getPredictionsService } from '@/services/predictions'

  const props = defineProps<{
    embalse: StationByCodeResponse
    initialValue?: SimulationOperation | null
  }>()

  const emit = defineEmits<{
    simulate: [payload: SimulationOperation]
  }>()

  function nextMultipleOf5(date: Date): Date {
    const result = new Date(date)
    const m = result.getMinutes()
    const remainder = m % 5
    result.setMinutes(remainder === 0 ? m + 5 : m + (5 - remainder), 0, 0)
    return result
  }

  function snapTo5(date: Date | null): Date | null {
    if (!date) return null
    const m = date.getMinutes()
    const rounded = Math.round(m / 5) * 5
    if (m === rounded) return date
    const fixed = new Date(date)
    fixed.setMinutes(rounded, 0, 0)
    return fixed
  }

  const defaultStart = nextMultipleOf5(new Date())
  const caudalSalida = ref<number | null>(null)
  const fechaInicio = ref<Date | null>(defaultStart)
  const fechaFin = ref<Date | null>(null)
  const loadingDefault = ref(false)

  const isEditing = computed(() => props.initialValue != null)

  async function fetchDefaultCaudal(stationCode: string) {
    if (isEditing.value) return
    loadingDefault.value = true
    try {
      const prediction = await getPredictionsService(stationCode, 'FICT95.historical')
      if (prediction?.results?.length && !isEditing.value) {
        caudalSalida.value = prediction.results[prediction.results.length - 1].value
      }
    } catch {
      // leave as null if fetch fails
    } finally {
      loadingDefault.value = false
    }
  }

  watch(
    () => props.embalse,
    (embalse) => fetchDefaultCaudal(embalse.stationCode),
    { immediate: true }
  )

  const isFormValid = computed(
    () => fechaInicio.value != null && fechaFin.value != null && caudalSalida.value != null
  )

  const minFechaFin = computed(() => {
    if (!fechaInicio.value) return defaultStart
    const d = new Date(fechaInicio.value)
    d.setMinutes(d.getMinutes() + 5, 0, 0)
    return d
  })

  watch(
    () => props.initialValue,
    (val) => {
      if (val) {
        caudalSalida.value = val.caudalSalida
        fechaInicio.value = new Date(val.fechaInicio)
        fechaFin.value = new Date(val.fechaFin)
      }
    }
  )

  watch(fechaInicio, (val) => {
    const snapped = snapTo5(val)
    if (snapped !== val) {
      fechaInicio.value = snapped
      return
    }
    if (fechaFin.value && val && fechaFin.value <= val) {
      fechaFin.value = null
    }
  })

  watch(fechaFin, (val) => {
    const snapped = snapTo5(val)
    if (snapped !== val) fechaFin.value = snapped
  })

  function resetForm() {
    caudalSalida.value = null
    fechaInicio.value = nextMultipleOf5(new Date())
    fechaFin.value = null
    fetchDefaultCaudal(props.embalse.stationCode)
  }

  function onSubmit() {
    if (!isFormValid.value || !fechaInicio.value || !fechaFin.value || caudalSalida.value == null)
      return
    emit('simulate', {
      caudalSalida: caudalSalida.value,
      fechaInicio: fechaInicio.value,
      fechaFin: fechaFin.value,
      stationCode: props.embalse.stationCode,
      stationName: props.embalse.name,
    })
    resetForm()
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
</style>
