<template>
  <div class="time-controls">
    <v-card elevation="6" class="pa-3 time-card">
      <div class="d-flex align-center ga-3">
        <!-- PLAY / PAUSE -->
        <v-btn icon @click="togglePlay">
          <v-icon>
            {{ playing ? 'mdi-pause' : 'mdi-play' }}
          </v-icon>
        </v-btn>

        <!-- SLIDER -->
        <v-slider
          v-model="timeIndex"
          :max="timeline.length - 1"
          :step="1"
          hide-details
          class="flex-grow-1"
        />

        <!-- TIME LABEL -->
        <div class="time-label">
          {{ formattedTime }}
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch, onUnmounted } from 'vue'
  import { useTimeStore } from '@/stores/timeStore'
  import { storeToRefs } from 'pinia'
  import { addHours, format } from 'date-fns'

  const timeStore = useTimeStore()
  const { layers } = storeToRefs(timeStore)

  const timeIndex = ref(0)
  const playing = ref(false)
  let timer: number | null = null

  // ==============================
  // 🕒 Construir timeline
  // ==============================

  const timeline = computed(() => {
    const firstLayer = Object.values(layers.value)[0]

    if (!firstLayer) return []

    const start = new Date(firstLayer.start)
    const end = new Date(firstLayer.end)

    const times: Date[] = []

    let current = start

    while (current <= end) {
      times.push(new Date(current))
      current = addHours(current, firstLayer.stepHours)
    }

    return times
  })

  // ==============================
  // 📅 Tiempo actual
  // ==============================

  const currentTime = computed(() => {
    return timeline.value[timeIndex.value]
  })

  watch(currentTime, (t) => {
    if (!t) return
    timeStore.setCurrentTime(t.toISOString())
  })

  // ==============================
  // ⏯ Play
  // ==============================

  function togglePlay() {
    playing.value = !playing.value

    if (playing.value) {
      timer = window.setInterval(() => {
        if (timeIndex.value >= timeline.value.length - 1) {
          timeIndex.value = 0
        } else {
          timeIndex.value++
        }
      }, 1000)
    } else {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
  }

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  // ==============================
  // 🕒 Formato
  // ==============================

  const formattedTime = computed(() => {
    const t = currentTime.value
    if (!t) return ''
    return format(t, 'yyyy-MM-dd HH:mm')
  })
</script>

<style scoped>
  .time-controls {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    width: 600px;
  }

  .time-card {
    backdrop-filter: blur(6px);
  }

  .time-label {
    min-width: 140px;
    font-size: 13px;
    font-weight: 500;
  }
</style>
