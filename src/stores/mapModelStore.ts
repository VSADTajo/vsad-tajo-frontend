import { defineStore } from 'pinia'
import { ref } from 'vue'

export type MapModel = 'nam' | 'mike11'

export const useMapModelStore = defineStore('mapModel', () => {
  const selectedModel = ref<MapModel>('nam')
  return { selectedModel }
})
