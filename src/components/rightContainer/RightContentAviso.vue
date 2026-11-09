<template>
  <v-card class="pa-2 bg-background" elevation="2">
    <template v-if="hasAvisoData">
      <v-card-title class="d-flex justify-space-between align-start pa-6" :style="headerStyle">
        <div>
          <div class="text-h6 font-weight-bold" style="color: white">
            {{ displayArea }}
          </div>
          <div class="text-caption" style="color: rgba(255, 255, 255, 0.9)">Aviso AEMET</div>
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          style="color: white"
          @click="closeDrawer"
        />
      </v-card-title>

      <v-card-text class="bg-surface">
        <!-- Chips severidad / urgencia del tramo seleccionado -->
        <div class="d-flex align-center ga-2 mb-3 pt-4 flex-wrap">
          <span class="text-body-2 font-weight-medium">Severidad:</span>
          <v-chip :color="severityChipColor" variant="tonal" size="small" class="font-weight-bold">
            {{ severityLabel }}
          </v-chip>

          <span class="text-body-2 font-weight-medium ml-4">Urgencia:</span>
          <v-chip variant="tonal" size="small" class="font-weight-bold">
            {{ urgencyLabel }}
          </v-chip>

          <v-chip
            variant="outlined"
            size="small"
            class="font-weight-bold ml-auto"
            prepend-icon="mdi-clock-outline"
          >
            {{ selectedSlotLabel }}
          </v-chip>
        </div>

        <div v-if="descriptionText" class="mb-3">
          <div class="text-body-2 font-weight-medium mb-1">Descripción</div>
          <div class="text-body-2 text-medium-emphasis">{{ descriptionText }}</div>
        </div>

        <div v-if="instructionText" class="mb-4">
          <div class="text-body-2 font-weight-medium mb-1">Instrucciones</div>
          <div class="text-body-2 text-medium-emphasis">{{ instructionText }}</div>
        </div>

        <!-- Gráfica de barras -->
        <v-card variant="outlined" class="pa-2">
          <div class="text-subtitle-2 font-weight-bold px-2 pb-1">Nivel por intervalo (72h)</div>
          <apexchart type="bar" height="470" :options="chartOptions" :series="chartSeries" />
        </v-card>
      </v-card-text>
    </template>

    <v-card-text v-else class="d-flex align-center justify-center" style="height: 240px">
      <div class="text-medium-emphasis">No se encontró información del aviso seleccionado.</div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAvisosStore, type AvisoFeature } from '@/stores/avisosStore'
  import type { ApexOptions } from 'apexcharts'

  const route = useRoute()
  const router = useRouter()
  const avisosStore = useAvisosStore()

  // ── helpers de tiempo (mismo patrón que MapAvisosTimeControls) ────────────

  function startOfDay(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  function addHours(date: Date, hours: number): Date {
    const d = new Date(date)
    d.setHours(d.getHours() + hours)
    return d
  }

  function addDays(date: Date, days: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  function formatSlotLabel(start: Date): string {
    const base = new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).format(start)
    return base.replace(/(\d{2})$/, '$1hs')
  }

  /** Genera los 12 slots de 6h: hoy, mañana, pasado mañana (4 slots × 3 días) */
  const slots = computed(() => {
    const today = startOfDay(new Date())
    const result: { start: Date; end: Date; label: string }[] = []

    for (let day = 0; day < 3; day++) {
      const dayStart = addDays(today, day)
      for (const hour of [0, 6, 12, 18]) {
        const start = addHours(dayStart, hour)
        const end = addHours(start, 6)
        result.push({ start, end, label: formatSlotLabel(start) })
      }
    }

    return result
  })

  // ── nivel → valor numérico para el eje Y ─────────────────────────────────

  const levelToValue: Record<string, number> = {
    amarillo: 1,
    naranja: 2,
    rojo: 3,
  }

  const levelToColor: Record<string, string> = {
    amarillo: '#facc15',
    naranja: '#f97316',
    rojo: '#ef4444',
  }

  const levelLabels: Record<number, string> = {
    0: 'Sin aviso',
    1: 'Amarillo',
    2: 'Naranja',
    3: 'Rojo',
  }

  // ── aviso seleccionado ────────────────────────────────────────────────────
  // AEMET issues a separate feature per time window/severity for the same
  // zone, so one areaDesc can map to several features — each 6h slot in the
  // chart may therefore belong to a different feature, with its own
  // severity/description/instruction/urgency, not just a different reading
  // of a single feature.

  const avisoQuery = computed(() => {
    const value = route.query.aviso
    return typeof value === 'string' ? value : undefined
  })

  const avisosForZone = computed<AvisoFeature[]>(() => {
    if (!avisoQuery.value) return []
    return avisosStore.avisos.filter((feature) => {
      const areaDesc = String(feature.properties?.areaDesc ?? '').trim()
      return areaDesc === avisoQuery.value
    })
  })

  const hasAvisoData = computed(() => avisosForZone.value.length > 0)
  const displayArea = computed(() => avisoQuery.value ?? 'Aviso')

  /** Para cada slot, la feature de mayor severidad que lo solapa (si alguna) */
  const slotFeatures = computed<(AvisoFeature | null)[]>(() => {
    return slots.value.map(({ start, end }) => {
      const slotStart = start.getTime()
      const slotEnd = end.getTime()

      let best: AvisoFeature | null = null
      let bestLevel = 0

      for (const feature of avisosForZone.value) {
        const props = feature.properties as Record<string, unknown>
        const effective = Date.parse(String(props.effective ?? ''))
        const expires = Date.parse(String(props.expires ?? ''))
        if (!Number.isFinite(effective) || !Number.isFinite(expires)) continue

        const overlaps = effective < slotEnd && expires > slotStart
        if (!overlaps) continue

        const level = levelToValue[String(props.level ?? '').toLowerCase()] ?? 0
        if (level > bestLevel) {
          bestLevel = level
          best = feature
        }
      }

      return best
    })
  })

  const slotValues = computed(() =>
    slotFeatures.value.map((feature) => {
      const props = feature?.properties as Record<string, unknown> | undefined
      return levelToValue[String(props?.level ?? '').toLowerCase()] ?? 0
    })
  )

  /** Primer slot con la severidad más alta — selección por defecto */
  const defaultSlotIndex = computed(() => {
    let maxValue = 0
    let maxIndex = 0

    slotValues.value.forEach((value, index) => {
      if (value > maxValue) {
        maxValue = value
        maxIndex = index
      }
    })

    return maxIndex
  })

  const manualSlotIndex = ref<number | null>(null)

  watch(avisoQuery, () => {
    manualSlotIndex.value = null
  })

  const selectedSlotIndex = computed(() => manualSlotIndex.value ?? defaultSlotIndex.value)
  const selectedFeature = computed<AvisoFeature | null>(
    () => slotFeatures.value[selectedSlotIndex.value] ?? null
  )
  const selectedProperties = computed<Record<string, unknown>>(
    () => (selectedFeature.value?.properties ?? {}) as Record<string, unknown>
  )
  const selectedSlotLabel = computed(() => slots.value[selectedSlotIndex.value]?.label ?? '')

  // ── severity / urgency chips ──────────────────────────────────────────────

  const severityLabel = computed(() => {
    const s = String(selectedProperties.value.severity ?? '').toLowerCase()
    const translations: Record<string, string> = {
      extreme: 'Extremo',
      severe: 'Severo',
      moderate: 'Moderado',
      minor: 'Menor',
    }
    return translations[s] ?? (s ? String(selectedProperties.value.severity) : 'N/A')
  })

  const severityChipColor = computed(() => {
    const s = String(selectedProperties.value.severity ?? '').toLowerCase()
    switch (s) {
      case 'extreme':
        return 'error'
      case 'severe':
        return 'deep-orange'
      case 'moderate':
        return 'warning'
      case 'minor':
        return 'success'
      default:
        return 'default'
    }
  })

  const urgencyLabel = computed(() => {
    const u = String(selectedProperties.value.urgency ?? '').toLowerCase()
    const translations: Record<string, string> = {
      immediate: 'Inmediata',
      expected: 'Prevista',
      future: 'Futura',
      past: 'Pasada',
      unknown: 'Desconocida',
    }
    return translations[u] ?? (u ? String(selectedProperties.value.urgency) : 'N/A')
  })

  const descriptionText = computed(() => String(selectedProperties.value.description ?? '').trim())
  const instructionText = computed(() => String(selectedProperties.value.instruction ?? '').trim())

  function selectSlot(index: number): void {
    manualSlotIndex.value = index
  }

  function withAlpha(hex: string, alpha: number): string {
    const value = Number.parseInt(hex.slice(1), 16)
    const r = (value >> 16) & 255
    const g = (value >> 8) & 255
    const b = value & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  /** Color de cada barra según el valor — la barra seleccionada va a color
   *  completo, el resto atenuadas para marcar cuál describen los datos de
   *  arriba. */
  const barColors = computed(() =>
    slotValues.value.map((v, index) => {
      const level = Object.entries(levelToValue).find(([, val]) => val === v)?.[0] ?? ''
      const color = levelToColor[level] ?? '#e5e7eb'
      return index === selectedSlotIndex.value ? color : withAlpha(color, 0.45)
    })
  )

  const chartSeries = computed(() => [
    {
      name: 'Nivel',
      data: slotValues.value,
    },
  ])

  const chartOptions = computed<ApexOptions>(() => ({
    chart: {
      type: 'bar',
      toolbar: { show: false },
      animations: { enabled: false },
      events: {
        dataPointSelection: (_event, _chartContext, config) => {
          selectSlot(config.dataPointIndex)
        },
      },
    },
    plotOptions: {
      bar: {
        distributed: true,
        borderRadius: 4,
        columnWidth: '70%',
      },
    },
    colors: barColors.value,
    dataLabels: { enabled: false },
    legend: { show: false },
    xaxis: {
      categories: slots.value.map((s) => s.label),
      labels: {
        rotate: -45,
        style: { fontSize: '10px' },
      },
    },
    yaxis: {
      min: 0,
      max: 3,
      tickAmount: 3,
      labels: {
        formatter: (val: number) => levelLabels[Math.round(val)] ?? '',
        style: { fontSize: '11px' },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => levelLabels[Math.round(val)] ?? 'Sin aviso',
      },
    },
    grid: {
      borderColor: '#e0e0e0',
    },
  }))

  // ── estilo encabezado ─────────────────────────────────────────────────────

  const headerStyle = computed(() => ({
    background: 'linear-gradient(135deg, #0f4c81 0%, #0b365c 100%)',
    margin: '-8px -8px 0 -8px',
  }))

  function closeDrawer() {
    const queryObj = { ...route.query }
    delete queryObj.aviso
    router.replace({ query: queryObj })
  }
</script>
