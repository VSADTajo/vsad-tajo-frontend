import { defineStore } from 'pinia'

export const useSimulationsStore = defineStore('simulations', {
  state: () => ({
    activeSimulationId: null as string | null,
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
    setActiveSimulation(id: string | null) {
      this.activeSimulationId = id
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
