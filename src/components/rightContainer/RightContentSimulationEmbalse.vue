<template>
  <div
    v-if="loading || station"
    class="d-flex justify-space-between align-start pa-4 saih-sticky-header"
    :style="headerStyle"
  >
    <div v-if="station">
      <div class="text-h6 font-weight-bold" style="color: white">
        {{ station.stationCode }}
      </div>
      <div class="text-caption" style="color: rgba(255, 255, 255, 0.9)">
        {{ station.name }}
      </div>
    </div>
    <div v-else>
      <div class="text-h6 font-weight-bold" style="color: white">Cargando estacion</div>
      <div class="text-caption" style="color: rgba(255, 255, 255, 0.9)">Recuperando datos...</div>
    </div>

    <v-btn icon="mdi-close" variant="text" size="small" style="color: white" @click="close" />
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { getStationByCodeService, type StationByCodeResponse } from '@/services/general'
  import { getSaihTypeColor } from '@/utils/saihStations'

  const route = useRoute()
  const router = useRouter()

  const loading = ref(false)
  const station = ref<StationByCodeResponse | null>(null)

  const stationCode = computed(() => route.query.station as string | undefined)

  function shadeHex(hex: string, factor: number): string {
    const value = hex.replace('#', '')
    const full =
      value.length === 3
        ? value
            .split('')
            .map((c) => c + c)
            .join('')
        : value
    const num = Number.parseInt(full, 16)
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
    const r = clamp(((num >> 16) & 255) * factor)
    const g = clamp(((num >> 8) & 255) * factor)
    const b = clamp((num & 255) * factor)
    return `rgb(${r}, ${g}, ${b})`
  }

  const headerStyle = computed(() => {
    if (!station.value) {
      return { background: 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)' }
    }
    const base = getSaihTypeColor(station.value.tipoCod)
    return { background: `linear-gradient(135deg, ${base} 0%, ${shadeHex(base, 0.72)} 100%)` }
  })

  let requestId = 0

  watch(
    stationCode,
    async (code) => {
      station.value = null
      if (!code) return
      const id = ++requestId
      loading.value = true
      try {
        const result = await getStationByCodeService(code)
        if (id === requestId) station.value = result
      } finally {
        if (id === requestId) loading.value = false
      }
    },
    { immediate: true }
  )

  function close() {
    const query = { ...route.query }
    delete query.station
    router.replace({ query })
  }
</script>

<style scoped>
  .saih-sticky-header {
    position: sticky;
    top: 0;
    z-index: 30;
    border-radius: 4px 4px 0 0;
  }
</style>