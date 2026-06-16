import { defineStore } from 'pinia'

export const useSimulationsStore = defineStore('simulations', {
  state: () => ({
    activeSimulationId: null as string | null,
    historyOpen: false,
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
  },
})