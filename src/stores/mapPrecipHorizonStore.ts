import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PrecipAccumulatedHours } from '@/types/Predictions'

// Drives MapPrecipHorizonToggle.vue — the accumulation window (hours) used
// by GET /predictions/precip-accumulated. Kept as a plain number regardless
// of data source; the toggle's displayed sign (+/-) is cosmetic only
// (Observado looks back, Harmonie/EPS look ahead) and doesn't change which
// hours value is actually selected.
export const useMapPrecipHorizonStore = defineStore('mapPrecipHorizon', () => {
  const selectedHours = ref<PrecipAccumulatedHours>(1)
  return { selectedHours }
})
