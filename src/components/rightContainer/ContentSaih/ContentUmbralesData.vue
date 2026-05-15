<template>
  <v-card class="bg-surface" elevation="2">
    <v-card-title class="text-subtitle-1 font-weight-bold">Umbrales</v-card-title>
    <v-divider />
    <v-card-text>
      <template v-if="activeTab === 'caudal'">
        <div class="text-caption text-medium-emphasis font-weight-bold mb-2">
          Umbrales de caudal
        </div>

        <template v-if="hasAnyThreshold">
          <v-row>
            <v-col cols="12" md="4" class="d-flex align-center ga-2">
              <span class="threshold-badge threshold-badge--yellow">Nivel 1:</span>
              <span class="font-weight-medium">{{ threshold1Label }}</span>
            </v-col>
            <v-col cols="12" md="4" class="d-flex align-center ga-2">
              <span class="threshold-badge threshold-badge--orange">Nivel 2</span>
              <span class="font-weight-medium">{{ threshold2Label }}</span>
            </v-col>
            <v-col cols="12" md="4" class="d-flex align-center ga-2">
              <span class="threshold-badge threshold-badge--red">Nivel 3:</span>
              <span class="font-weight-medium">{{ threshold3Label }}</span>
            </v-col>
          </v-row>
        </template>
        <div v-else class="text-caption text-medium-emphasis">No hay umbrales de caudal.</div>

        <template v-if="isEmbalse">
          <v-divider class="my-3" />
          <div class="text-caption text-medium-emphasis font-weight-bold mb-2">
            Umbrales de volumen
          </div>
          <template v-if="hasAnyVolumeThreshold">
            <v-row>
              <v-col cols="12" md="4" class="d-flex align-center ga-2">
                <span class="threshold-badge threshold-badge--yellow">Nivel 1:</span>
                <span class="font-weight-medium">{{ volumeThreshold1Label }}</span>
              </v-col>
              <v-col cols="12" md="4" class="d-flex align-center ga-2">
                <span class="threshold-badge threshold-badge--orange">Nivel 2</span>
                <span class="font-weight-medium">{{ volumeThreshold2Label }}</span>
              </v-col>
              <v-col cols="12" md="4" class="d-flex align-center ga-2">
                <span class="threshold-badge threshold-badge--red">Nivel 3:</span>
                <span class="font-weight-medium">{{ volumeThreshold3Label }}</span>
              </v-col>
            </v-row>
          </template>
          <div v-else class="text-caption text-medium-emphasis">No hay umbrales de volumen.</div>
        </template>
      </template>

      <div v-else class="text-caption text-medium-emphasis">
        No hay umbrales para precipitaciones.
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed, watch } from 'vue'

  const props = defineProps<{
    activeTab: 'caudal' | 'precipitaciones'
    isEmbalse?: boolean
    thresholds?: Record<string, unknown>
  }>()

  function readNumber(keys: string[], source?: Record<string, unknown>): number | null {
    if (!source) return null

    for (const key of keys) {
      const raw = source[key]
      if (raw == null) continue

      if (typeof raw === 'number' && Number.isFinite(raw)) return raw
      if (typeof raw === 'string') {
        const parsed = Number.parseFloat(raw.replace(',', '.'))
        if (Number.isFinite(parsed)) return parsed
      }
    }

    return null
  }

  const threshold1 = computed(() => readNumber(['umbral_caudal_1'], props.thresholds))

  const threshold2 = computed(() => readNumber(['umbral_caudal_2'], props.thresholds))

  const threshold3 = computed(() => readNumber(['umbral_caudal_3'], props.thresholds))

  const volumeThreshold1 = computed(() => readNumber(['umbral_1_volumen'], props.thresholds))

  const volumeThreshold2 = computed(() => readNumber(['umbral_2_volumen'], props.thresholds))

  const volumeThreshold3 = computed(() => readNumber(['umbral_3_volumen'], props.thresholds))

  function formatThreshold(value: number | null): string {
    if (value == null) return '--'
    return `${value.toFixed(2)} m3/s`
  }

  function formatVolumeThreshold(value: number | null): string {
    if (value == null) return '--'
    return `${value.toFixed(2)} hm3`
  }

  const threshold1Label = computed(() => formatThreshold(threshold1.value))
  const threshold2Label = computed(() => formatThreshold(threshold2.value))
  const threshold3Label = computed(() => formatThreshold(threshold3.value))

  const volumeThreshold1Label = computed(() => formatVolumeThreshold(volumeThreshold1.value))
  const volumeThreshold2Label = computed(() => formatVolumeThreshold(volumeThreshold2.value))
  const volumeThreshold3Label = computed(() => formatVolumeThreshold(volumeThreshold3.value))

  const hasAnyThreshold = computed(
    () => threshold1.value != null || threshold2.value != null || threshold3.value != null
  )

  const hasAnyVolumeThreshold = computed(
    () =>
      volumeThreshold1.value != null ||
      volumeThreshold2.value != null ||
      volumeThreshold3.value != null
  )

  watch(
    () => props.thresholds,
    (thresholds) => {
      if (!props.isEmbalse || !thresholds) return
    },
    { immediate: true }
  )
</script>

<style scoped>
  .threshold-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 600;
  }

  .threshold-badge--yellow {
    background: #fde68a;
    color: #7c2d12;
  }

  .threshold-badge--orange {
    background: #fdba74;
    color: #7c2d12;
  }

  .threshold-badge--red {
    background: #fca5a5;
    color: #7f1d1d;
  }
</style>
