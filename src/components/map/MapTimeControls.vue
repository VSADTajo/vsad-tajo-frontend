<template>
  <div class="time-controls">
    <v-card elevation="8" class="pa-4 bg-primary opacity-90 time-card">
      <!-- TOP: TIME DISPLAY -->
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="time-main">
          {{ formattedDate }}
        </div>

        <div class="time-sub">
          {{ formattedHour }}
        </div>
      </div>

      <!-- CONTROLS -->
      <div class="d-flex align-center ga-2">
        <!-- BACK -->
        <v-btn icon size="small" @click="stepBack">
          <v-icon>mdi-skip-previous</v-icon>
        </v-btn>

        <!-- PLAY -->
        <v-btn icon size="small" @click="togglePlay">
          <v-icon>
            {{ playing ? 'mdi-pause' : 'mdi-play' }}
          </v-icon>
        </v-btn>

        <!-- FORWARD -->
        <v-btn icon size="small" @click="stepForward">
          <v-icon>mdi-skip-next</v-icon>
        </v-btn>

        <!-- SLIDER -->
        <v-slider
          v-model="timeIndex"
          :max="timeline.length - 1"
          :step="1"
          hide-details
          density="compact"
          color="white"
          track-color="green"
          thumb-color="white"
          class="timeline-slider mr-5 ml-5"
        />
      </div>

      <!-- RANGE -->
      <div class="d-flex justify-space-between timeline-range mt-1">
        <span>{{ startLabel }}</span>
        <span>{{ endLabel }}</span>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch, onUnmounted } from 'vue'
  import { addHours } from 'date-fns'
  import { useLayersStore } from '@/stores/layersStore'
  import {
    dateFormattedFromDate,
    dateFormattedWithHoursAndMinutesFromDate,
    HourFormattedFromDate,
  } from '@/utils/dates'

  const layersStore = useLayersStore()

  const timeIndex = ref(0)
  const playing = ref(false)
  let timer: number | null = null

  // ==============================
  // 🕒 Capas temporales activas
  // ==============================

  const temporalLayers = computed(() =>
    Object.values(layersStore.layers).filter((layer) => layer.visible && layer.temporal)
  )

  // ==============================
  // 🕒 Construir timeline
  // ==============================

  const timeline = computed(() => {
    const firstLayer = temporalLayers.value[0]

    if (!firstLayer?.temporal) return []

    const { start, end, stepHours } = firstLayer.temporal

    const times: Date[] = []

    let current = new Date(start)
    const endDate = new Date(end)

    while (current <= endDate) {
      times.push(new Date(current))
      current = addHours(current, stepHours)
    }

    return times
  })

  // ==============================
  // 📅 Tiempo actual
  // ==============================

  const currentTime = computed(() => {
    return timeline.value[timeIndex.value]
  })

  const formattedDate = computed(() => {
    const t = currentTime.value
    if (!t) return ''
    return dateFormattedFromDate(t)
  })

  const formattedHour = computed(() => {
    const t = currentTime.value
    if (!t) return ''
    return HourFormattedFromDate(t)
  })

  const startLabel = computed(() => {
    if (!timeline.value.length) return ''
    return dateFormattedWithHoursAndMinutesFromDate(timeline.value[0])
  })

  const endLabel = computed(() => {
    if (!timeline.value.length) return ''
    return dateFormattedWithHoursAndMinutesFromDate(timeline.value[timeline.value.length - 1])
  })

  watch(currentTime, (t) => {
    if (!t) return

    temporalLayers.value.forEach((layer) => {
      layersStore.setTimeParams(layer.id, {
        time: t.toISOString(),
      })
    })
  })

  watch(
    () => temporalLayers.value.map((l) => l.params?.time),
    (times) => {
      const time = times.find(Boolean)
      if (!time) return

      const target = new Date(time).getTime()

      const index = timeline.value.findIndex((t) => t.getTime() === target)

      if (index !== -1) {
        timeIndex.value = index
      }
    },
    { immediate: true }
  )

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
      }, 2000)
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

  function stepForward() {
    if (timeIndex.value < timeline.value.length - 1) timeIndex.value++
  }

  function stepBack() {
    if (timeIndex.value > 0) timeIndex.value--
  }
</script>

<style scoped>
  .time-controls {
    position: absolute;
    bottom: 25px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    width: 720px;
  }

  .time-card {
    backdrop-filter: blur(10px);
    /* background: rgba(30, 30, 30, 0.75); */
    border-radius: 14px;
  }

  .time-main {
    font-size: 18px;
    font-weight: 600;
    color: white;
  }

  .time-sub {
    font-size: 14px;
    color: #ccc;
  }

  .timeline-slider {
    flex-grow: 1;
    margin-left: 8px;
    margin-right: 8px;
  }

  .timeline-range {
    font-size: 11px;
    color: #aaa;
  }
</style>
