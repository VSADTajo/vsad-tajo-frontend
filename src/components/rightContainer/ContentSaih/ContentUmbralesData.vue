<template>
  <v-card class="bg-surface" elevation="2">
    <v-card-title class="text-subtitle-1 font-weight-bold">Umbrales</v-card-title>
    <v-divider />
    <v-card-text>
      <template v-if="activeTab === 'caudal'">
        <template v-if="hasAnyThreshold">
          <v-row>
            <v-col cols="7" class="text-caption text-medium-emphasis">
              <span class="threshold-badge threshold-badge--yellow">Nivel 1</span>
            </v-col>
            <v-col cols="5" class="text-right font-weight-medium">
              <span>{{ threshold1Label }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="7" class="text-caption text-medium-emphasis">
              <span class="threshold-badge threshold-badge--orange">Nivel 2</span>
            </v-col>
            <v-col cols="5" class="text-right font-weight-medium">
              <span>{{ threshold2Label }}</span>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="7" class="text-caption text-medium-emphasis">
              <span class="threshold-badge threshold-badge--red">Nivel 3</span>
            </v-col>
            <v-col cols="5" class="text-right font-weight-medium">
              <span>{{ threshold3Label }}</span>
            </v-col>
          </v-row>
        </template>

        <div v-else class="text-caption text-medium-emphasis">No hay umbrales de caudal.</div>
      </template>

      <div v-else class="text-caption text-medium-emphasis">
        No hay umbrales para precipitaciones.
      </div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'

  const props = defineProps<{
    activeTab: 'caudal' | 'precipitaciones'
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

  const threshold1 = computed(() =>
    readNumber(['umbral_cauda_1', 'umbral_caudal_1', 'threshold_yellow'], props.thresholds)
  )

  const threshold2 = computed(() =>
    readNumber(['umbral_cauda_2', 'umbral_caudal_2', 'threshold_orange'], props.thresholds)
  )

  const threshold3 = computed(() =>
    readNumber(['umbral_cauda_3', 'umbral_caudal_3', 'threshold_red'], props.thresholds)
  )

  function formatThreshold(value: number | null): string {
    if (value == null) return '--'
    return `${value.toFixed(2)} m3/s`
  }

  const threshold1Label = computed(() => formatThreshold(threshold1.value))
  const threshold2Label = computed(() => formatThreshold(threshold2.value))
  const threshold3Label = computed(() => formatThreshold(threshold3.value))

  const hasAnyThreshold = computed(
    () => threshold1.value != null || threshold2.value != null || threshold3.value != null
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
