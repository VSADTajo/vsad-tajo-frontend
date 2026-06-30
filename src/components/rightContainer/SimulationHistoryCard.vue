<template>
  <v-card
    variant="outlined"
    class="sim-card bg-surface mt-2"
    :class="{
      'sim-card--clickable': clickable,
      'sim-card--active': isActive,
    }"
    v-on="clickable ? { click: () => emit('toggle-activate') } : {}"
  >
    <v-card-item class="pb-1 pt-2 px-3">
      <template #prepend>
        <v-icon :color="cfg.color" size="16" class="mr-1">{{ cfg.icon }}</v-icon>
      </template>
      <v-card-title class="text-body-2 font-weight-medium pa-0 text-truncate">
        {{ sim.description || sim.id }}
      </v-card-title>
      <template #append>
        <v-chip v-if="isActive" color="surface" size="x-small" class="mr-1">Activa</v-chip>
        <v-chip :color="cfg.color" size="x-small" variant="tonal">{{ cfg.label }}</v-chip>
      </template>
    </v-card-item>

    <v-card-text class="pt-1 pb-2 px-3">
      <div class="d-flex align-center justify-space-between mb-1">
        <span class="text-caption" :class="isActive ? 'text-surface' : 'text-medium-emphasis'">
          {{ formatDateDDMMYYYY(new Date(sim.createdAt)) }}
        </span>
        <div class="d-flex align-center gap-1">
          <v-tooltip text="Editar Simulación" location="bottom">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                size="x-small"
                elevation="0"
                class="mr-2"
                @click.stop="editDialog = true"
              >
                <v-icon size="16">mdi-pencil-outline</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
          <v-tooltip text="Eliminar" location="bottom">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                size="x-small"
                elevation="0"
                color="error"
                @click.stop="confirmDelete = true"
              >
                <v-icon size="16">mdi-trash-can-outline</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </div>
      </div>

      <button class="ops-toggle text-caption" @click.stop="emit('toggle-expand')">
        <v-icon size="12" class="mr-1">
          {{ isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
        </v-icon>
        {{ sim.maneuvers.length }}
        {{ sim.maneuvers.length === 1 ? 'operación' : 'operaciones' }}
      </button>

      <v-expand-transition>
        <div v-if="isExpanded" ref="expandedRef" class="mt-2">
          <div
            v-for="m in sim.maneuvers"
            :key="m.id"
            class="op-item text-caption mb-1 pa-2 rounded"
          >
            <div class="font-weight-medium text-truncate">{{ m.reservoirCode }}</div>
            <div :class="isActive ? 'text-surface' : 'text-medium-emphasis'">
              {{ fmtDate(m.startDate) }} → {{ fmtDate(m.endDate) }}
            </div>
            <div>{{ m.outputFlowValue }} m³/s</div>
          </div>
        </div>
      </v-expand-transition>
    </v-card-text>
  </v-card>

  <SimulationEditDialog v-model="editDialog" :sim="sim" @saved="emit('reload')" />

  <v-dialog
    v-model="confirmDelete"
    max-width="380"
    @click:outside="!deleting && (confirmDelete = false)"
  >
    <v-card>
      <v-card-title class="text-subtitle-1 pt-4 px-4 bg-primary">Eliminar simulación</v-card-title>
      <v-card-text class="px-4 pb-2">¿Estás seguro de eliminar esta simulación?</v-card-text>
      <v-card-actions class="px-4 pb-4 pt-2">
        <v-spacer />
        <v-btn variant="text" :disabled="deleting" @click="confirmDelete = false">Cancelar</v-btn>
        <v-btn color="error" variant="flat" :loading="deleting" @click="onConfirmDelete">
          Eliminar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  import { ref, watch, nextTick, computed } from 'vue'
  import type { SimulationRecord } from '@/types/Simulations'
  import { formatDateDDMMYYYY, formatDateDDMM } from '@/utils/dates'
  import { deleteSimulationService } from '@/services/general'
  import SimulationEditDialog from './SimulationEditDialog.vue'

  const props = defineProps<{
    sim: SimulationRecord
    isActive: boolean
    isExpanded: boolean
    clickable?: boolean
  }>()

  const emit = defineEmits<{
    'toggle-activate': []
    'toggle-expand': []
    reload: []
    delete: []
  }>()

  const statusConfig = {
    FINALIZED: { color: 'success', label: 'Finalizada', icon: 'mdi-check-circle-outline' },
    MODEL_PROCESSING: { color: 'warning', label: 'Procesando', icon: 'mdi-clock-outline' },
    MODEL_FAILED: { color: 'error', label: 'Errónea', icon: 'mdi-alert-circle-outline' },
  } as const

  const cfg = computed(() => statusConfig[props.sim.status])

  const expandedRef = ref<HTMLElement | null>(null)
  const confirmDelete = ref(false)
  const deleting = ref(false)
  const editDialog = ref(false)

  watch(
    () => props.isExpanded,
    async (val) => {
      if (!val) return
      await nextTick()
      expandedRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  )

  async function onConfirmDelete() {
    deleting.value = true
    try {
      await deleteSimulationService(props.sim.id)
      confirmDelete.value = false
      emit('delete')
    } finally {
      deleting.value = false
    }
  }

  function fmtDate(iso: string | null): string {
    if (!iso) return '--'
    return formatDateDDMM(new Date(iso))
  }
</script>

<style scoped>
  .sim-card--clickable {
    cursor: pointer;
  }

  .sim-card--active {
    border-color: rgb(var(--v-theme-primary)) !important;
    background: rgba(var(--v-theme-primary), 0.7) !important;
    color: rgb(var(--v-theme-on-primary)) !important;
  }

  .ops-toggle {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    display: flex;
    align-items: center;
    opacity: 0.7;
    padding: 0;
  }

  .ops-toggle:hover {
    opacity: 1;
  }

  .op-item {
    background: rgba(var(--v-theme-on-surface), 0.05);
  }
</style>
