import { defineStore } from 'pinia'

type FlyToTarget = {
  lat: number
  lng: number
  zoom?: number
  animate?: boolean
  token: number
}

export const useMapStore = defineStore('map', {
  state: () => ({
    flyToTarget: null as FlyToTarget | null,
  }),

  actions: {
    requestFlyTo(lat: number, lng: number, options?: { zoom?: number; animate?: boolean }) {
      this.flyToTarget = {
        lat,
        lng,
        zoom: options?.zoom,
        animate: options?.animate,
        token: Date.now(),
      }
    },

    clearFlyToTarget() {
      this.flyToTarget = null
    },
  },
})
