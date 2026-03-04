import { ref } from 'vue'

const selectedBasemap = ref<string>('2')

export function useBasemap() {
  function setBasemap(id: string) {
    selectedBasemap.value = id
  }

  return {
    selectedBasemap,
    setBasemap,
  }
}
