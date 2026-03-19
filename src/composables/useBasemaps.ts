import { ref } from 'vue'

const selectedBasemap = ref<string[]>(['osm'])

export function useBasemap() {
  function setBasemap(id: string) {
    selectedBasemap.value = [id]
  }

  return {
    selectedBasemap,
    setBasemap,
  }
}
