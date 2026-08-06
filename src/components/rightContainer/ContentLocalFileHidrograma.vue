<template>
  <v-row justify="center" class="px-3 align-stretch">
    <v-col
      cols="12"
      md="3"
      lg="2"
      class="order-2 order-md-1 d-flex flex-column"
      style="min-height: 0"
    >
      <v-card
        ref="leftStatusCardEl"
        class="ma-2 pa-2 bg-background w-100 flex-shrink-0"
        elevation="2"
      >
        <ContentSaihAlertStatus :caudal-historical="historical" :thresholds="chartThresholds" />
      </v-card>

      <v-card
        ref="leftObservedCardEl"
        class="ma-2 pa-2 bg-background w-100 flex-shrink-0"
        elevation="2"
      >
        <v-row>
          <v-col cols="6" md="12">
            <ContentObservedData
              :is-embalse="isEmbalse"
              :caudal-historical="historical"
              :thresholds="chartThresholds"
            />
          </v-col>
        </v-row>
      </v-card>

      <v-card
        ref="leftSummaryCardEl"
        class="ma-2 mt-0 pa-2 bg-background w-100 d-flex flex-column summary-container-card"
        elevation="2"
        :style="leftSummaryCardStyle"
      >
        <ContentSaihOperationalSummary
          mode="observed"
          :is-embalse="isEmbalse"
          :caudal-historical="historical"
          :thresholds="chartThresholds"
          title="Resumen Operativo Observado"
        />
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="8" class="pt-2 pt-md-4 order-1 order-md-2 d-flex flex-column">
      <div ref="centerStackEl" class="w-100 d-flex flex-column">
        <v-card class="bg-background w-100 d-flex flex-column">
          <v-card-text>
            <v-sheet class="pa-2">
              <v-tabs v-if="hasVolumen" v-model="selectedVariant" density="compact" class="mb-3">
                <v-tab value="caudal">Caudal</v-tab>
                <v-tab value="volumen">Volumen</v-tab>
              </v-tabs>

              <ForecastChartNew
                :data="chartData"
                :is-embalse="isEmbalse"
                :height="470"
                :thresholds="chartThresholds"
                :focus-threshold-request="thresholdFocusRequest"
                @focus-threshold-complete="handleThresholdFocusComplete"
              />
            </v-sheet>
          </v-card-text>
        </v-card>

        <v-card v-if="selectedVariant !== 'volumen'" class="mt-2 pa-2 bg-background" elevation="2">
          <ContentUmbralesData
            active-tab="caudalNAM"
            :is-embalse="isEmbalse"
            :thresholds="resolvedThresholds"
            :selected-threshold="selectedThreshold"
            @focus-threshold="handleThresholdFocus"
          />
        </v-card>

        <v-card class="pa-2 bg-background mt-2" elevation="2">
          <ContentSaihCaudalMatrix
            :forecast-harmonie="forecastHarmonie"
            :forecast-epsat="forecastEpsat"
            :forecast-ens-p10="forecastEnsP10"
            :forecast-ens-p25="forecastEnsP25"
            :forecast-ens-p75="forecastEnsP75"
            :forecast-ens-p90="forecastEnsP90"
            :thresholds="chartThresholds"
            :no-thresholds="selectedVariant === 'volumen'"
          />
        </v-card>
      </div>
    </v-col>

    <v-col
      cols="12"
      md="3"
      lg="2"
      class="order-3 order-md-3 d-flex flex-column pl-0"
      style="min-height: 0"
    >
      <v-card
        ref="rightStatusCardEl"
        class="ma-2 pa-2 bg-background w-100 flex-shrink-0"
        elevation="2"
      >
        <ContentSaihAlertStatus
          :caudal-forecast-harmonie="forecastHarmonie"
          :caudal-forecast-epsat="forecastEpsat"
          :mode="'predictions'"
          :thresholds="chartThresholds"
        />
      </v-card>
      <v-card
        ref="rightLatestCardEl"
        class="ma-2 pa-2 bg-background w-100 flex-shrink-0"
        elevation="2"
      >
        <ContentSaihPredictionsLatest
          class="ma-2"
          hide-date-selector
          :caudal-forecast-harmonie="forecastHarmonie"
          :caudal-forecast-epstat="forecastEpsat"
          :thresholds="chartThresholds"
        />
      </v-card>

      <v-card
        ref="rightSummaryCardEl"
        class="ma-2 mt-0 pa-2 bg-background w-100 d-flex flex-column summary-container-card"
        elevation="2"
        :style="rightSummaryCardStyle"
      >
        <ContentSaihOperationalSummary
          mode="predictions"
          :caudal-forecast-harmonie="forecastHarmonie"
          :caudal-forecast-epstat="forecastEpsat"
          :caudal-forecast-ens-p10="forecastEnsP10"
          :caudal-forecast-ens-p25="forecastEnsP25"
          :caudal-forecast-ens-p75="forecastEnsP75"
          :caudal-forecast-ens-p90="forecastEnsP90"
          :thresholds="chartThresholds"
          title="Resumen Operativo Predicciones"
        />
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import type { DataStationPrediction } from '@/types/Predictions'

  import ContentSaihAlertStatus from './ContentSaih/ContentSaihAlertStatus.vue'
  import ForecastChartNew from '../charts/ForecastChartNew.vue'
  import ContentObservedData from './ContentSaih/ContentObservedData.vue'
  import ContentSaihOperationalSummary from './ContentSaih/ContentSaihOperationalSummary.vue'
  import ContentUmbralesData from './ContentSaih/ContentUmbralesData.vue'
  import ContentSaihCaudalMatrix from './ContentSaih/ContentSaihCaudalMatrix.vue'
  import ContentSaihPredictionsLatest from './ContentSaih/ContentSaihPredictionsLatest.vue'
  import { getStationByCodeService } from '@/services/general'

  type ThresholdType = 'caudal' | 'volumen'
  type ThresholdLevel = 1 | 2 | 3
  type ThresholdSelection = { kind: ThresholdType; level: ThresholdLevel } | null
  type ThresholdFocusRequest = {
    action: 'focus' | 'reset'
    kind?: ThresholdType
    level?: ThresholdLevel
    nonce: number
  }

  const props = defineProps<{
    isEmbalse?: boolean
    thresholds?: Record<string, unknown>
    predictions?: DataStationPrediction
    volumenPredictions?: DataStationPrediction
    stationCode?: string
  }>()

  // Umbrales are static station config, not "predictions" — fetched live
  // the same way the non-local-file view does (RightContentSaih.vue), even
  // while everything else on this page comes from the loaded file. Local
  // files never carry threshold data of their own.
  const liveThreshold = ref<Record<string, unknown> | null>(null)

  watch(
    () => props.stationCode,
    async (code) => {
      liveThreshold.value = null
      if (!code) return

      try {
        const station = await getStationByCodeService(code)
        liveThreshold.value = (station.threshold as Record<string, unknown> | null) ?? null
      } catch {
        liveThreshold.value = null
      }
    },
    { immediate: true }
  )

  // The only threshold value the backend sends for an embalse often lives
  // under umbralVolumenX, but it's a caudal-scale figure (there is no
  // separate, distinct volumen threshold) — valid to surface as
  // "umbral_caudal_X" for caudal-variant consumers (ContentUmbralesData, the
  // caudal chart/matrix). Must NOT be reused on volumen-scale displays
  // (different units) — see chartThresholds below, which volumen-variant
  // consumers bind to instead of this directly.
  const resolvedThresholds = computed<Record<string, unknown> | undefined>(() => {
    if (!liveThreshold.value) return props.thresholds

    const t = liveThreshold.value
    const flattened = {
      umbral_caudal_1: t.umbralCaudal1 ?? t.umbralNivel1 ?? t.umbralVolumen1 ?? null,
      umbral_caudal_2: t.umbralCaudal2 ?? t.umbralNivel2 ?? t.umbralVolumen2 ?? null,
      umbral_caudal_3: t.umbralCaudal3 ?? t.umbralNivel3 ?? t.umbralVolumen3 ?? null,
      umbral_cauda_1: t.umbralCaudal1 ?? t.umbralNivel1 ?? t.umbralVolumen1 ?? null,
      umbral_cauda_2: t.umbralCaudal2 ?? t.umbralNivel2 ?? t.umbralVolumen2 ?? null,
      umbral_cauda_3: t.umbralCaudal3 ?? t.umbralNivel3 ?? t.umbralVolumen3 ?? null,
    }

    return { ...props.thresholds, ...t, ...flattened }
  })

  // Caudal and volumen are kept as separate DataStationPrediction objects
  // (same reasoning as the store split) — an embalse with both shows a small
  // Caudal/Volumen switch, mirroring how the live app treats them as
  // distinct views rather than merging them into one series.
  const hasVolumen = computed(() => Object.keys(props.volumenPredictions ?? {}).length > 0)
  const hasCaudalData = computed(() => Object.keys(props.predictions ?? {}).length > 0)
  const selectedVariant = ref<'caudal' | 'volumen'>('caudal')

  // Thresholds are caudal-scale only — never valid on the volumen chart/
  // matrix (different units/scale), so those consumers get undefined there.
  const chartThresholds = computed<Record<string, unknown> | undefined>(() =>
    selectedVariant.value === 'volumen' ? undefined : resolvedThresholds.value
  )

  // Reset the default variant whenever the underlying station's data changes
  // (this component is reused across station navigation) — otherwise a
  // station without caudal data could be stuck showing an empty caudal view
  // while its actual volumen data sits one tab away.
  watch(
    [hasCaudalData, hasVolumen],
    ([caudal, volumen]) => {
      selectedVariant.value = caudal ? 'caudal' : volumen ? 'volumen' : 'caudal'
    },
    { immediate: true }
  )

  const activePredictions = computed(() =>
    selectedVariant.value === 'volumen' ? props.volumenPredictions : props.predictions
  )

  const historical = computed(() => activePredictions.value?.historical)
  const forecastHarmonie = computed(() => activePredictions.value?.forecastHarmonie)
  const forecastEpsat = computed(() => activePredictions.value?.forecastEpsat)
  const forecastEnsP10 = computed(() => activePredictions.value?.forecastEnsP10)
  const forecastEnsP25 = computed(() => activePredictions.value?.forecastEnsP25)
  const forecastEnsP75 = computed(() => activePredictions.value?.forecastEnsP75)
  const forecastEnsP90 = computed(() => activePredictions.value?.forecastEnsP90)

  const chartData = computed(() => ({
    historical: historical.value,
    forecastHarmonie: forecastHarmonie.value,
    forecastEpsat: forecastEpsat.value,
    forecastEnsP10: forecastEnsP10.value,
    forecastEnsP25: forecastEnsP25.value,
    forecastEnsP90: forecastEnsP90.value,
    forecastEnsP75: forecastEnsP75.value,
  }))

  // ── Threshold focus ───────────────────────────────────────────────────────
  const selectedThreshold = ref<ThresholdSelection>(null)
  const thresholdFocusRequest = ref<ThresholdFocusRequest | null>(null)
  const thresholdFocusNonce = ref(0)

  function handleThresholdFocus(payload: ThresholdSelection): void {
    selectedThreshold.value = payload
    thresholdFocusNonce.value += 1

    if (!payload) {
      thresholdFocusRequest.value = { action: 'reset', nonce: thresholdFocusNonce.value }
      return
    }

    thresholdFocusRequest.value = {
      action: 'focus',
      kind: payload.kind,
      level: payload.level,
      nonce: thresholdFocusNonce.value,
    }
  }

  function handleThresholdFocusComplete(): void {
    // Selection stays active until the user toggles it off.
  }

  // ── Layout height management (mirrors ContentSaihTabHidrograma) ───────────
  const centerStackEl = ref<HTMLElement | null>(null)
  const leftStatusCardEl = ref<unknown>(null)
  const leftObservedCardEl = ref<unknown>(null)
  const leftSummaryCardEl = ref<unknown>(null)
  const rightStatusCardEl = ref<unknown>(null)
  const rightLatestCardEl = ref<unknown>(null)
  const rightSummaryCardEl = ref<unknown>(null)

  const leftSummaryHeightPx = ref(280)
  const rightSummaryHeightPx = ref(280)

  const leftSummaryCardStyle = computed(() => ({
    minHeight: '0',
    height: `${leftSummaryHeightPx.value}px`,
    maxHeight: `${leftSummaryHeightPx.value}px`,
  }))

  const rightSummaryCardStyle = computed(() => ({
    minHeight: '0',
    height: `${rightSummaryHeightPx.value}px`,
    maxHeight: `${rightSummaryHeightPx.value}px`,
  }))

  function resolveElement(target: unknown): HTMLElement | null {
    if (target instanceof HTMLElement) return target
    if (
      typeof target === 'object' &&
      target !== null &&
      '$el' in target &&
      (target as { $el?: unknown }).$el instanceof HTMLElement
    ) {
      return (target as { $el: HTMLElement }).$el
    }
    return null
  }

  function outerHeightWithMargins(target: unknown): number {
    const el = resolveElement(target)
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const styles = window.getComputedStyle(el)
    const mt = Number.parseFloat(styles.marginTop || '0') || 0
    const mb = Number.parseFloat(styles.marginBottom || '0') || 0
    return rect.height + mt + mb
  }

  function updateSummaryHeights(): void {
    const target = resolveElement(centerStackEl.value)?.getBoundingClientRect().height ?? 0
    if (target <= 0) return

    const leftBase =
      outerHeightWithMargins(leftStatusCardEl.value) +
      outerHeightWithMargins(leftObservedCardEl.value)
    const rightBase =
      outerHeightWithMargins(rightStatusCardEl.value) +
      outerHeightWithMargins(rightLatestCardEl.value)

    leftSummaryHeightPx.value = Math.max(0, target - leftBase)
    rightSummaryHeightPx.value = Math.max(0, target - rightBase)
  }

  let layoutObserver: ResizeObserver | null = null

  onMounted(() => {
    nextTick(() => {
      updateSummaryHeights()

      if (typeof ResizeObserver !== 'undefined') {
        layoutObserver = new ResizeObserver(() => updateSummaryHeights())
        const observed = [
          centerStackEl.value,
          leftStatusCardEl.value,
          leftObservedCardEl.value,
          rightStatusCardEl.value,
          rightLatestCardEl.value,
          leftSummaryCardEl.value,
          rightSummaryCardEl.value,
        ]

        for (const target of observed) {
          const el = resolveElement(target)
          if (el) layoutObserver.observe(el)
        }
      }
    })
  })

  onBeforeUnmount(() => {
    layoutObserver?.disconnect()
    layoutObserver = null
  })

  watch(
    () => props.isEmbalse,
    () => nextTick(updateSummaryHeights)
  )
</script>

<style scoped>
  .summary-container-card {
    min-height: 0;
    overflow: hidden;
  }
</style>
