import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function useNavigation() {
  const route = useRoute()
  const router = useRouter()

  const activeSection = computed(() => {
    if (route.path === '/') return null
    return route.path.replace('/', '')
  })

  const drawerOpen = computed(() => !!activeSection.value)

  function toggleSection(section: string) {
    // Keep the current query string (station, localStation, aviso, ...) —
    // a plain path push drops it, which was silently closing the right-side
    // chart drawer (its own visibility is driven by those query params)
    // every time the left menu was toggled.
    if (activeSection.value === section) {
      router.push({ path: '/', query: route.query })
      return
    }

    router.push({ path: `/${section}`, query: route.query })
  }

  // Each panel's own back/close button used to call `router.push('/')`
  // directly — same query-dropping bug as toggleSection above, just
  // duplicated across every panel instead of fixed once.
  function closeSection() {
    router.push({ path: '/', query: route.query })
  }

  return {
    drawerOpen,
    activeSection,
    toggleSection,
    closeSection,
  }
}
