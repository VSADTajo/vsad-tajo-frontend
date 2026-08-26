import { defineStore } from 'pinia'
import { ref } from 'vue'

// 'caudal' only applies under the 'observado' data source, where there's a
// single observed series (no NAM vs MIKE11 distinction) — see MapView.vue's
// model toggle, which shows Caudal/Precipitación for observado and
// Caudal NAM/Caudal MIKE/Precipitaciones otherwise.
export type MapModel = 'nam' | 'mike11' | 'caudal' | 'precipitacion'

export const useMapModelStore = defineStore('mapModel', () => {
  const selectedModel = ref<MapModel>('nam')
  return { selectedModel }
})
