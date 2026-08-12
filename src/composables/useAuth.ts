import { computed } from 'vue'
import { useStorage } from '@vueuse/core'

export function useAuth() {
  const roles = useStorage<string[]>('roles', [])

  function hasRole(role: string): boolean {
    return roles.value.includes(role)
  }

  const isLoggedIn = computed(() => !!localStorage.getItem('token'))

  return {
    roles,
    hasRole,
    isLoggedIn,
  }
}
