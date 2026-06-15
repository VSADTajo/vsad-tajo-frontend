<template>
  <v-card class="bg-surface mb-2" elevation="2">
    <v-card-text class="pt-0">
      <template v-if="activeTab === 'caudal'">
        <div class="text-caption text-medium-emphasis font-weight-bold mb-2 mt-1">
          Umbrales de caudal
        </div>
        <div v-if="hasAnyThreshold" class="thresholds-row">
          <div class="threshold-item">
            <v-chip
              :class="['threshold-chip', { 'threshold-chip--active': isSelected('caudal', 1) }]"
              color="#fde68a"
              size="x-small"
              variant="flat"
              clickable
              :aria-pressed="isSelected('caudal', 1)"
              @click="focusThreshold('caudal', 1)"
            >
              Nivel 1
            </v-chip>
            <span class="threshold-value">{{ threshold1Label }}</span>
          </div>
          <div class="threshold-item">
            <v-chip
              :class="['threshold-chip', { 'threshold-chip--active': isSelected('caudal', 2) }]"
              color="#fdba74"
              size="x-small"
              variant="flat"
              clickable
              :aria-pressed="isSelected('caudal', 2)"
              @click="focusThreshold('caudal', 2)"
            >
              Nivel 2
            </v-chip>
            <span class="threshold-value">{{ threshold2Label }}</span>
          </div>
          <div class="threshold-item">
            <v-chip
              :class="['threshold-chip', { 'threshold-chip--active': isSelected('caudal', 3) }]"
              color="#fca5a5"
              size="x-small"
              variant="flat"
              clickable
              :aria-pressed="isSelected('caudal', 3)"
              @click="focusThreshold('caudal', 3)"
            >
              Nivel 3
            </v-chip>
            <span class="threshold-value">{{ threshold3Label }}</span>
          </div>
        </div>
        <div v-else class="text-caption text-medium-emphasis pt-2">No hay umbrales de caudal.</div>
      </template>

      <template v-else-if="activeTab === 'volumen' && isEmbalse">
        <div class="text-caption text-medium-emphasis font-weight-bold mb-2 mt-1">
          Umbrales de volumen
        </div>
        <div v-if="hasAnyVolumeThreshold" class="thresholds-row">
          <div class="threshold-item">
            <v-chip
              :class="['threshold-chip', { 'threshold-chip--active': isSelected('volumen', 1) }]"
              color="#fde68a"
              size="x-small"
              variant="flat"
              clickable
              :aria-pressed="isSelected('volumen', 1)"
              @click="focusThreshold('volumen', 1)"
            >
              Nivel 1
            </v-chip>
            <span class="threshold-value">{{ volumeThreshold1Label }}</span>
          </div>
          <div class="threshold-item">
            <v-chip
              :class="['threshold-chip', { 'threshold-chip--active': isSelected('volumen', 2) }]"
              color="#fdba74"
              size="x-small"
              variant="flat"
              clickable
              :aria-pressed="isSelected('volumen', 2)"
              @click="focusThreshold('volumen', 2)"
            >
              Nivel 2
            </v-chip>
            <span class="threshold-value">{{ volumeThreshold2Label }}</span>
          </div>
          <div class="threshold-item">
            <v-chip
              :class="['threshold-chip', { 'threshold-chip--active': isSelected('volumen', 3) }]"
              color="#fca5a5"
              size="x-small"
              variant="flat"
              clickable
              :aria-pressed="isSelected('volumen', 3)"
              @click="focusThreshold('volumen', 3)"
            >
              Nivel 3
            </v-chip>
            <span class="threshold-value">{{ volumeThreshold3Label }}</span>
          </div>
        </div>
        <div v-else class="text-caption text-medium-emphasis pt-2">No hay umbrales de volumen.</div>
      </template>

      <div v-else class="text-caption text-medium-emphasis pt-2">No hay umbrales disponibles.</div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'

  type ThresholdType = 'caudal' | 'volumen'
  type ThresholdLevel = 1 | 2 | 3

  const props = defineProps<{
    activeTab: 'caudal' | 'volumen' | 'precipitaciones'
    isEmbalse?: boolean
    thresholds?: Record<string, unknown>
    selectedThreshold?: { kind: ThresholdType; level: ThresholdLevel } | null
  }>()

  const emit = defineEmits<{
    (event: 'focus-threshold', payload: { kind: ThresholdType; level: ThresholdLevel } | null): void
  }>()

  function focusThreshold(kind: ThresholdType, level: ThresholdLevel): void {
    if (isSelected(kind, level)) {
      emit('focus-threshold', null)
      return
    }

    emit('focus-threshold', { kind, level })
  }

  function isSelected(kind: ThresholdType, level: ThresholdLevel): boolean {
    return props.selectedThreshold?.kind === kind && props.selectedThreshold?.level === level
  }

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
    readNumber(['umbral_caudal_1', 'umbralCaudal1'], props.thresholds)
  )

  const threshold2 = computed(() =>
    readNumber(['umbral_caudal_2', 'umbralCaudal2'], props.thresholds)
  )

  const threshold3 = computed(() =>
    readNumber(['umbral_caudal_3', 'umbralCaudal3'], props.thresholds)
  )

  const nestedThreshold = computed(
    () => props.thresholds?.threshold as Record<string, unknown> | undefined
  )

  const volumeThreshold1 = computed(() => readNumber(['umbralVolumen1'], nestedThreshold.value))

  const volumeThreshold2 = computed(() => readNumber(['umbralVolumen2'], nestedThreshold.value))

  const volumeThreshold3 = computed(() => readNumber(['umbralVolumen3'], nestedThreshold.value))

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
</script>

<style scoped>
  .thresholds-row {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px 12px;
    align-items: center;
    overflow: hidden;
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .threshold-item {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }

  .threshold-value {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .threshold-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.75rem;
    white-space: nowrap;
    min-width: 58px;
    transition:
      transform 0.15s ease,
      filter 0.15s ease;
    cursor: pointer;
  }

  .threshold-chip:hover {
    transform: translateY(-1px);
    filter: brightness(0.9);
  }

  .threshold-chip--active {
    outline: 2px solid rgba(21, 101, 192, 0.8);
    outline-offset: 1px;
    transform: translateY(-1px) scale(1.05);
    filter: brightness(0.82) saturate(1.4);
  }
</style>
