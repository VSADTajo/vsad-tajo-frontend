import { defineStore } from 'pinia'
import { getSimulationResultsService } from '@/services/simulations'
import type { SimulationResultsResponse } from '@/types/Simulations'

export const useSimulationsStore = defineStore('simulations', {
  state: () => ({
    activeSimulationId: null as string | null,
    simulationResults: null as SimulationResultsResponse | null,
    loadingResults: false,
    historyOpen: false,
    panelActive: false,
    mapClickedStationCode: null as string | null,
    simulationCreatedCount: 0,
  }),
  getters: {
    isSimulationActive(): boolean {
      return this.activeSimulationId !== null
    },
  },
  actions: {
    async setActiveSimulation(id: string | null) {
      this.activeSimulationId = id
      this.simulationResults = null

      if (!id) {
        this.loadingResults = false
        return
      }

      this.loadingResults = true
      try {
        this.simulationResults = await getSimulationResultsService(id)
      } catch {
        this.simulationResults = null
      } finally {
        this.loadingResults = false
      }
    },
    toggleHistory() {
      this.historyOpen = !this.historyOpen
    },
    closeHistory() {
      this.historyOpen = false
    },
    setPanelActive(active: boolean) {
      this.panelActive = active
    },
    notifyMapStationClick(code: string) {
      this.mapClickedStationCode = code
    },
    consumeMapStationClick() {
      this.mapClickedStationCode = null
    },
    notifySimulationCreated() {
      this.simulationCreatedCount++
    },
  },
})
