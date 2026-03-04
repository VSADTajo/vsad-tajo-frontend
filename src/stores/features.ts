import { defineStore } from 'pinia'

export const useFeatureSelection = defineStore('featureSelection', {
  state: () => ({
    selected: null as GeoJSON.Feature | null,
  }),
  actions: {
    select(feature: GeoJSON.Feature) {
      this.selected = feature
    },
    clear() {
      this.selected = null
    },
  },
})
