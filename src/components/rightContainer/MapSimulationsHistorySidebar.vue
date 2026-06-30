<template>
  <div class="sim-history-panel" :class="{ 'sim-history-panel--open': open }">
    <div class="sim-history-content">
      <div class="sim-history-header bg-surface">
        <span class="text-subtitle-2 font-weight-medium">Simulaciones</span>
        <v-chip v-if="simulations.length" size="x-small" color="primary" class="ml-2">
          {{ simulations.length }}
        </v-chip>
        <v-spacer />
        <v-tooltip text="Recargar simulaciones" location="left">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              size="small"
              :loading="refreshing"
              class="mr-1"
              variant="flat"
              @click="fetchSimulations()"
            >
              <v-icon size="18">mdi-refresh</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
        <v-btn icon size="small" color="primary" variant="flat" @click="emit('close')">
          <v-icon size="18">mdi-close</v-icon>
        </v-btn>
      </div>

      <div v-if="loading" class="pa-4 d-flex flex-column gap-2">
        <v-skeleton-loader type="list-item-two-line" />
        <v-skeleton-loader type="list-item-two-line" />
        <v-skeleton-loader type="list-item-two-line" />
      </div>

      <div v-else class="sim-sections">
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
            <template v-if="refreshing">
              <v-skeleton-loader type="list-item-two-line" class="sim-list-item" />
              <v-skeleton-loader type="list-item-two-line" class="sim-list-item" />
            </template>
            <template v-else-if="disponibles.length">
              <SimulationHistoryCard
                v-for="sim in disponibles"
                :key="sim.id"
                :sim="sim"
                :is-active="isActive(sim.id)"
                :is-expanded="expandedSim === sim.id"
                :clickable="true"
                class="sim-list-item"
                @toggle-activate="toggleActivate(sim.id)"
                @toggle-expand="toggleExpand(sim.id)"
                @reload="reloadSimulation(sim.id)"
                @delete="deleteSimulation(sim.id)"
              />
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
            <template v-if="refreshing">
              <v-skeleton-loader type="list-item-two-line" class="sim-list-item" />
              <v-skeleton-loader type="list-item-two-line" class="sim-list-item" />
            </template>
            <template v-else-if="noDisponibles.length">
              <SimulationHistoryCard
                v-for="sim in noDisponibles"
                :key="sim.id"
                :sim="sim"
                :is-active="false"
                :is-expanded="expandedSim === sim.id"
                class="sim-list-item"
                @toggle-expand="toggleExpand(sim.id)"
                @reload="reloadSimulation(sim.id)"
                @delete="deleteSimulation(sim.id)"
              />
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
  import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
  import type { SimulationRecord } from '@/types/Simulations'
  import { useSimulationsStore } from '@/stores/simulationsStore'
  import { useMapStore } from '@/stores/mapStore'
  import { setSimulationMarkers, setDownstreamMarkers } from '@/utils/saihMarkersRegistry'
  import {
    getSimulationsService,
    getDownstreamStationsService,
    getStationByCodeService,
  } from '@/services/general'
  import { center as mapCenter, defaultZoom } from '@/constants/mapConfig'
  import SimulationHistoryCard from './SimulationHistoryCard.vue'

  defineProps<{ open: boolean }>()

  const emit = defineEmits<{ close: [] }>()

  const simulationsStore = useSimulationsStore()
  const mapStore = useMapStore()

  const simulations = ref<SimulationRecord[]>([])
  const loading = ref(false)
  const refreshing = ref(false)

  async function fetchSimulations(isInitial = false) {
    if (isInitial) {
      loading.value = true
    } else {
      refreshing.value = true
    }
    try {
      simulations.value = await getSimulationsService()
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  const disponibles = computed(() => simulations.value.filter((s) => s.status === 'FINALIZED'))
  const noDisponibles = computed(() => simulations.value.filter((s) => s.status !== 'FINALIZED'))

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

  watch(
    () => simulationsStore.activeSimulationId,
    async (id) => {
      setDownstreamMarkers(null)
      if (!id) {
        setSimulationMarkers(null)
        const [lat, lng] = mapCenter as [number, number]
        mapStore.requestFlyTo(lat, lng, { zoom: defaultZoom })
        return
      }
      const sim = simulations.value.find((s) => s.id === id)
      if (!sim) {
        setSimulationMarkers(null)
        return
      }
      const codes = [...new Set(sim.maneuvers.map((m) => m.reservoirCode))]
      setSimulationMarkers(codes)
      try {
        const stations = await Promise.all(codes.map((c) => getStationByCodeService(c)))
        const withCoords = stations.filter((s) => s.latitude != null && s.longitude != null)
        if (withCoords.length) {
          const lat = withCoords.reduce((sum, s) => sum + s.latitude!, 0) / withCoords.length
          const lng = withCoords.reduce((sum, s) => sum + s.longitude!, 0) / withCoords.length
          mapStore.requestFlyTo(lat, lng, { zoom: 9 })
        }
      } catch {
        // flyTo is best-effort
      }
      try {
        const downstream = await getDownstreamStationsService(codes)
        setDownstreamMarkers(downstream)
      } catch {
        // downstream is best-effort
      }
    }
  )

  let refreshInterval: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    fetchSimulations(true)
    refreshInterval = setInterval(() => fetchSimulations(), 120_000)
  })

  onUnmounted(() => {
    if (refreshInterval !== null) clearInterval(refreshInterval)
    setSimulationMarkers(null)
    setDownstreamMarkers(null)
    simulationsStore.setActiveSimulation(null)
  })

  async function reloadSimulation(id: string) {
    await fetchSimulations(false)
    const sim = simulations.value.find((s) => s.id === id)
    if (!sim || !isActive(id)) return
    const codes = [...new Set(sim.maneuvers.map((m) => m.reservoirCode))]
    setSimulationMarkers(codes)
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
    height: calc(100vh - var(--v-layout-top, 0px));
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
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .sim-section {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
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
    min-height: 0;
    overflow-y: auto;
    padding: 8px;
  }

  .sim-list-item {
    margin-top: 6px;
  }
</style>
