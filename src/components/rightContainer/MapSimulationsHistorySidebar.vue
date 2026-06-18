<template>
  <div class="sim-history-panel" :class="{ 'sim-history-panel--open': open }">
    <div class="sim-history-content">
      <div class="sim-history-header bg-surface">
        <span class="text-subtitle-2 font-weight-medium">Simulaciones</span>
        <v-chip v-if="simulations.length" size="x-small" color="primary" class="ml-2">
          {{ simulations.length }}
        </v-chip>
        <v-spacer />
        <v-btn icon size="small" color="primary" variant="flat" @click="emit('close')">
          <v-icon size="18">mdi-close</v-icon>
        </v-btn>
      </div>

      <div class="sim-sections">
        <div class="sim-section">
          <div class="sim-section-header">
            <v-icon size="14" color="success" class="mr-1">mdi-check-circle-outline</v-icon>
            <span class="text-caption font-weight-medium">Disponibles</span>
            <v-chip
              v-if="disponibles.length"
              size="x-small"
              color="success"
              variant="tonal"
              class="ml-2"
            >
              {{ disponibles.length }}
            </v-chip>
          </div>
          <div class="sim-list">
            <template v-if="disponibles.length">
              <div v-for="sim in disponibles" :key="sim.id" class="sim-list-item">
                <v-card
                  variant="outlined"
                  class="sim-card bg-surface sim-card--clickable"
                  :class="{ 'sim-card--active': isActive(sim.id) }"
                  @click="toggleActivate(sim.id)"
                >
                  <v-card-item class="pb-1 pt-2 px-3">
                    <template #prepend>
                      <v-icon :color="statusConfig[sim.status].color" size="16" class="mr-1">
                        {{ statusConfig[sim.status].icon }}
                      </v-icon>
                    </template>
                    <v-card-title class="text-body-2 font-weight-medium pa-0">
                      {{ sim.id }}
                    </v-card-title>
                    <template #append>
                      <v-chip v-if="isActive(sim.id)" color="surface" size="x-small" class="mr-1">
                        Activa
                      </v-chip>
                      <v-chip
                        :color="statusConfig[sim.status].color"
                        size="x-small"
                        variant="tonal"
                      >
                        {{ statusConfig[sim.status].label }}
                      </v-chip>
                    </template>
                  </v-card-item>

                  <v-card-text class="pt-1 pb-2 px-3">
                    <div class="d-flex align-center justify-space-between mb-1">
                      <span
                        class="text-caption"
                        :class="isActive(sim.id) ? 'text-surface' : 'text-medium-emphasis'"
                      >
                        {{ formatDateDDMMYYYY(sim.createdAt) }}
                      </span>
                      <div class="d-flex align-center gap-1">
                        <v-tooltip text="Recargar" location="bottom">
                          <template #activator="{ props }">
                            <v-btn
                              v-bind="props"
                              icon
                              size="x-small"
                              elevation="0"
                              class="mr-2"
                              @click.stop="reloadSimulation(sim.id)"
                            >
                              <v-icon size="16">mdi-refresh</v-icon>
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
                              @click.stop="deleteSimulation(sim.id)"
                            >
                              <v-icon size="16">mdi-trash-can-outline</v-icon>
                            </v-btn>
                          </template>
                        </v-tooltip>
                      </div>
                    </div>
                    <button class="ops-toggle text-caption" @click.stop="toggleExpand(sim.id)">
                      <v-icon size="12" class="mr-1">
                        {{ expandedSim === sim.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                      </v-icon>
                      {{ sim.operations.length }}
                      {{ sim.operations.length === 1 ? 'operación' : 'operaciones' }}
                    </button>
                    <v-expand-transition>
                      <div v-if="expandedSim === sim.id" class="mt-2">
                        <div
                          v-for="(op, i) in sim.operations"
                          :key="i"
                          class="op-item text-caption mb-1 pa-2 rounded"
                        >
                          <div class="font-weight-medium text-truncate">{{ op.stationName }}</div>
                          <div :class="isActive(sim.id) ? 'text-surface' : 'text-medium-emphasis'">
                            {{ formatDateDDMM(op.fechaInicio) }} →
                            {{ formatDateDDMM(op.fechaFin) }}
                          </div>
                          <div>{{ op.caudalSalida }} m³/s</div>
                        </div>
                      </div>
                    </v-expand-transition>
                  </v-card-text>
                </v-card>
              </div>
            </template>
            <div v-else class="text-caption text-medium-emphasis text-center py-4">
              Sin simulaciones disponibles
            </div>
          </div>
        </div>

        <v-divider />

        <div class="sim-section">
          <div class="sim-section-header">
            <v-icon size="14" class="mr-1" color="medium-emphasis">mdi-clock-outline</v-icon>
            <span class="text-caption font-weight-medium">No disponibles</span>
            <v-chip v-if="noDisponibles.length" size="x-small" variant="tonal" class="ml-2">
              {{ noDisponibles.length }}
            </v-chip>
          </div>
          <div class="sim-list">
            <template v-if="noDisponibles.length">
              <div v-for="sim in noDisponibles" :key="sim.id" class="sim-list-item">
                <v-card variant="outlined" class="sim-card bg-surface">
                  <v-card-item class="pb-1 pt-2 px-3">
                    <template #prepend>
                      <v-icon :color="statusConfig[sim.status].color" size="16" class="mr-1">
                        {{ statusConfig[sim.status].icon }}
                      </v-icon>
                    </template>
                    <v-card-title class="text-body-2 font-weight-medium pa-0">
                      {{ sim.id }}
                    </v-card-title>
                    <template #append>
                      <v-chip
                        :color="statusConfig[sim.status].color"
                        size="x-small"
                        variant="tonal"
                      >
                        {{ statusConfig[sim.status].label }}
                      </v-chip>
                    </template>
                  </v-card-item>

                  <v-card-text class="pt-1 pb-2 px-3">
                    <div class="d-flex align-center justify-space-between mb-1">
                      <span class="text-caption text-medium-emphasis">
                        {{ formatDateDDMMYYYY(sim.createdAt) }}
                      </span>
                      <div class="d-flex align-center gap-1">
                        <v-tooltip text="Recargar" location="bottom">
                          <template #activator="{ props }">
                            <v-btn
                              v-bind="props"
                              icon
                              size="x-small"
                              elevation="0"
                              class="mr-2"
                              @click="reloadSimulation(sim.id)"
                            >
                              <v-icon size="16">mdi-refresh</v-icon>
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
                              @click="deleteSimulation(sim.id)"
                            >
                              <v-icon size="16">mdi-trash-can-outline</v-icon>
                            </v-btn>
                          </template>
                        </v-tooltip>
                      </div>
                    </div>
                    <button class="ops-toggle text-caption" @click="toggleExpand(sim.id)">
                      <v-icon size="12" class="mr-1">
                        {{ expandedSim === sim.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                      </v-icon>
                      {{ sim.operations.length }}
                      {{ sim.operations.length === 1 ? 'operación' : 'operaciones' }}
                    </button>
                    <v-expand-transition>
                      <div v-if="expandedSim === sim.id" class="mt-2">
                        <div
                          v-for="(op, i) in sim.operations"
                          :key="i"
                          class="op-item text-caption mb-1 pa-2 rounded"
                        >
                          <div class="font-weight-medium text-truncate">{{ op.stationName }}</div>
                          <div class="text-medium-emphasis">
                            {{ formatDateDDMM(op.fechaInicio) }} →
                            {{ formatDateDDMM(op.fechaFin) }}
                          </div>
                          <div>{{ op.caudalSalida }} m³/s</div>
                        </div>
                      </div>
                    </v-expand-transition>
                  </v-card-text>
                </v-card>
              </div>
            </template>
            <div v-else class="text-caption text-medium-emphasis text-center py-4">
              Sin simulaciones pendientes
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed } from 'vue'
  import type { SimulationRecord } from '@/types/Simulations'
  import { formatDateDDMMYYYY, formatDateDDMM } from '@/utils/dates'
  import { useSimulationsStore } from '@/stores/simulationsStore'

  defineProps<{ open: boolean }>()

  const emit = defineEmits<{ close: [] }>()

  const simulationsStore = useSimulationsStore()

  const statusConfig = {
    disponible: { color: 'success', label: 'Disponible', icon: 'mdi-check-circle-outline' },
    pendiente: { color: 'warning', label: 'Pendiente', icon: 'mdi-clock-outline' },
    erronea: { color: 'error', label: 'Errónea', icon: 'mdi-alert-circle-outline' },
  } as const

  const simulations = ref<SimulationRecord[]>([
    {
      id: 'SIM-001',
      createdAt: new Date('2026-06-10T09:30:00'),
      status: 'disponible',
      operations: [
        {
          caudalSalida: 150,
          fechaInicio: new Date('2026-06-10T10:00:00'),
          fechaFin: new Date('2026-06-10T18:00:00'),
          stationCode: 'E_32',
          stationName: 'Embalse de Buendía',
        },
      ],
    },
    {
      id: 'SIM-002',
      createdAt: new Date('2026-06-11T14:15:00'),
      status: 'pendiente',
      operations: [
        {
          caudalSalida: 200,
          fechaInicio: new Date('2026-06-11T15:00:00'),
          fechaFin: new Date('2026-06-12T15:00:00'),
          stationCode: 'E_50',
          stationName: 'Embalse de Entrepeñas',
        },
        {
          caudalSalida: 100,
          fechaInicio: new Date('2026-06-12T15:00:00'),
          fechaFin: new Date('2026-06-13T15:00:00'),
          stationCode: 'E_50',
          stationName: 'Embalse de Entrepeñas',
        },
      ],
    },
    {
      id: 'SIM-003',
      createdAt: new Date('2026-06-12T08:00:00'),
      status: 'erronea',
      operations: [
        {
          caudalSalida: 300,
          fechaInicio: new Date('2026-06-12T09:00:00'),
          fechaFin: new Date('2026-06-12T21:00:00'),
          stationCode: 'E_32',
          stationName: 'Embalse de Buendía',
        },
      ],
    },
  ])

  const disponibles = computed(() => simulations.value.filter((s) => s.status === 'disponible'))
  const noDisponibles = computed(() => simulations.value.filter((s) => s.status !== 'disponible'))

  const expandedSim = ref<string | null>(null)

  function isActive(id: string): boolean {
    return simulationsStore.activeSimulationId === id
  }

  function toggleExpand(id: string) {
    expandedSim.value = expandedSim.value === id ? null : id
  }

  function toggleActivate(id: string) {
    simulationsStore.setActiveSimulation(isActive(id) ? null : id)
  }

  function reloadSimulation(id: string) {
    console.log('[SimulationsHistorySidebar] reload', id)
  }

  function deleteSimulation(id: string) {
    const index = simulations.value.findIndex((s) => s.id === id)
    if (index === -1) return
    if (isActive(id)) simulationsStore.setActiveSimulation(null)
    simulations.value.splice(index, 1)
  }
</script>

<style scoped>
  .sim-history-panel {
    width: 0;
    height: 100%;
    overflow: hidden;
    flex-shrink: 0;
    transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    background: rgb(var(--v-theme-background));
    border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .sim-history-panel--open {
    width: 25vw;
  }

  .sim-history-content {
    width: 25vw;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sim-history-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .sim-sections {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .sim-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sim-section-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 8px 12px 6px;
    background: rgba(var(--v-theme-on-surface), 0.02);
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .sim-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .sim-list-item {
    margin-bottom: 8px;
  }

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
