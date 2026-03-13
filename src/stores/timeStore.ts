import type { WmsLayerTime } from '@/services/efasWmsService'
import { defineStore } from 'pinia'

export const useTimeStore = defineStore('time', {
  state: () => ({
    layers: {} as Record<string, WmsLayerTime>,
    currentTime: null as string | null,
  }),

  actions: {
    setLayerTime(layerId: string, time: WmsLayerTime) {
      this.layers[layerId] = time
    },
    removeLayerTime(layerId: string) {
      delete this.layers[layerId]
    },
    setCurrentTime(time: string) {
      this.currentTime = time
    },
  },
})
