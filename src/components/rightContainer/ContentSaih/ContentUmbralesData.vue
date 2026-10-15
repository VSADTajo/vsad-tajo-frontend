<template>
  <v-card class="bg-surface" elevation="2">
    <v-card-text class="pt-0">
      <template v-if="showsThresholds">
        <div class="text-body-2 font-weight-bold text-truncate mb-2 mt-2">
          {{ thresholdsTitle }}
        </div>
        <div v-if="hasAnyThreshold" class="thresholds-row">
          <div class="threshold-item">
            <v-tooltip location="top">
              <template #activator="{ props: tooltipProps }">
                <v-chip
                  v-bind="tooltipProps"
                  :class="['threshold-chip', { 'threshold-chip--active': isSelected('caudal', 1) }]"
                  color="#fde68a"
                  size="x-small"
                  variant="flat"
                  clickable
                  :aria-pressed="isSelected('caudal', 1)"
                  @click="focusThreshold('caudal', 1)"
                >
                  Amarillo
                </v-chip>
              </template>
              {{ threshold1PreciseLabel }}
            </v-tooltip>
            <span class="threshold-value">{{ threshold1Label }}</span>
          </div>
          <div class="threshold-item">
            <v-tooltip location="top">
              <template #activator="{ props: tooltipProps }">
                <v-chip
                  v-bind="tooltipProps"
                  :class="['threshold-chip', { 'threshold-chip--active': isSelected('caudal', 2) }]"
                  color="#fdba74"
                  size="x-small"
                  variant="flat"
                  clickable
                  :aria-pressed="isSelected('caudal', 2)"
                  @click="focusThreshold('caudal', 2)"
                >
                  Naranja
                </v-chip>
              </template>
              {{ threshold2PreciseLabel }}
            </v-tooltip>
            <span class="threshold-value">{{ threshold2Label }}</span>
          </div>
          <div class="threshold-item">
            <v-tooltip location="top">
              <template #activator="{ props: tooltipProps }">
                <v-chip
                  v-bind="tooltipProps"
                  :class="['threshold-chip', { 'threshold-chip--active': isSelected('caudal', 3) }]"
                  color="#fca5a5"
                  size="x-small"
                  variant="flat"
                  clickable
                  :aria-pressed="isSelected('caudal', 3)"
                  @click="focusThreshold('caudal', 3)"
                >
                  Rojo
                </v-chip>
              </template>
              {{ threshold3PreciseLabel }}
            </v-tooltip>
            <span class="threshold-value">{{ threshold3Label }}</span>
          </div>
        </div>
        <div v-else class="text-caption text-medium-emphasis pt-2">
          No hay {{ thresholdsTitle.toLowerCase() }}.
        </div>
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
    activeTab: // Legacy values, still the (unchanging) default passed for aforo
      // stations, which don't distinguish entrada/salida.
      | 'caudalNAM'
      | 'caudalMIKE'
      | 'caudalEntradaNAM'
      | 'caudalSalidaNAM'
      | 'caudalEntradaMIKE'
      | 'caudalSalidaMIKE'
      | 'volumenNAM'
      | 'volumenMIKE'
      | 'precipitaciones'
      | 'nivel'
    isEmbalse?: boolean
    thresholds?: Record<string, unknown>
    selectedThreshold?: { kind: ThresholdType; level: ThresholdLevel } | null
    // Some 'nivel' stations are really an absolute elevation ("COTA",
    // msnm) rather than a plain water level ("Nivel", m) — per-station,
    // passed down from nivelStations.ts rather than assumed.
    nivelLabel?: string
    nivelUnit?: string
  }>()

  // Embalse thresholds are defined for caudal de salida — Volumen NAM/MIKE
  // and Caudal Entrada NAM/MIKE don't carry that signal at all, so showing
  // the salida thresholds there would be both pointless and visually wrong
  // (ForecastChartNew would plot them against an axis/series they don't
  // apply to). Only the dedicated Salida tabs (plus aforo's caudalNAM/
  // caudalMIKE, which have no entrada/salida split to begin with) show them.
  const HIDDEN_TABS = new Set([
    'precipitaciones',
    'volumenNAM',
    'volumenMIKE',
    'caudalEntradaNAM',
    'caudalEntradaMIKE',
  ])

  const showsThresholds = computed(() => !HIDDEN_TABS.has(props.activeTab))

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
    props.activeTab === 'nivel'
      ? readNumber(['umbral_nivel_1', 'umbralNivel1'], props.thresholds)
      : readNumber(['umbral_caudal_1', 'umbralCaudal1', 'umbral_amarillo'], props.thresholds)
  )

  const threshold2 = computed(() =>
    props.activeTab === 'nivel'
      ? readNumber(['umbral_nivel_2', 'umbralNivel2'], props.thresholds)
      : readNumber(['umbral_caudal_2', 'umbralCaudal2', 'umbral_naranja'], props.thresholds)
  )

  const threshold3 = computed(() =>
    props.activeTab === 'nivel'
      ? readNumber(['umbral_nivel_3', 'umbralNivel3'], props.thresholds)
      : readNumber(['umbral_caudal_3', 'umbralCaudal3', 'umbral_rojo'], props.thresholds)
  )

  const thresholdUnit = computed(() =>
    props.activeTab === 'nivel' ? (props.nivelUnit ?? 'm') : 'm³/s'
  )

  const thresholdsTitle = computed(() =>
    props.activeTab === 'nivel'
      ? `Umbrales de ${props.nivelLabel ?? 'Nivel'}`
      : 'Umbrales de caudal'
  )

  function formatThreshold(value: number | null): string {
    if (value == null) return '--'
    const formattedValue = props.activeTab === 'nivel' ? value.toFixed(3) : Math.round(value)
    return `${formattedValue} ${thresholdUnit.value}`
  }

  const threshold1Label = computed(() => formatThreshold(threshold1.value))
  const threshold2Label = computed(() => formatThreshold(threshold2.value))
  const threshold3Label = computed(() => formatThreshold(threshold3.value))

  // The chip's own label rounds to a whole number for a cleaner read — this
  // tooltip keeps the decimals so the exact backend value is still one
  // hover away.
  function formatThresholdPrecise(value: number | null): string {
    if (value == null) return '--'
    const formattedValue = props.activeTab === 'nivel' ? value.toFixed(3) : value.toFixed(2)
    return `${formattedValue} ${thresholdUnit.value}`
  }

  const threshold1PreciseLabel = computed(() => formatThresholdPrecise(threshold1.value))
  const threshold2PreciseLabel = computed(() => formatThresholdPrecise(threshold2.value))
  const threshold3PreciseLabel = computed(() => formatThresholdPrecise(threshold3.value))

  const hasAnyThreshold = computed(
    () => threshold1.value != null || threshold2.value != null || threshold3.value != null
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
    padding-left: 4px;
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
