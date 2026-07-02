import { defineStore } from 'pinia'
import { ref } from 'vue'

export type MapDataSource = 'observado' | 'harmonie' | 'epsmedio'

export const useMapDataSourceStore = defineStore('mapDataSource', () => {
  const selectedDataSource = ref<MapDataSource>('harmonie')
  return { selectedDataSource }
})
