<template>
  <v-row justify="center" class="px-3 align-stretch">
    <v-col
      cols="12"
      md="3"
      lg="2"
      class="order-2 order-md-1 d-flex flex-column"
      style="min-height: 0"
    >
      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihAlertStatus
          active-tab="nivel"
          :loading="loadingNivel"
          :caudal-historical="nivelHistorical"
          :thresholds="thresholds"
        />
      </v-card>

      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <v-row>
          <v-col cols="6" md="12">
            <ContentObservedData
              active-tab="nivel"
              :loading="loadingNivel"
              :caudal-historical="nivelHistorical"
              :thresholds="thresholds"
              :nivel-unit="nivelUnit"
            />
          </v-col>
        </v-row>
      </v-card>

      <v-card
        class="ma-2 mt-0 pa-2 bg-background w-100 flex-grow-1 d-flex flex-column"
        elevation="2"
      >
        <ContentSaihOperationalSummary
          :loading="loadingNivel"
          mode="observed"
          :caudal-historical="nivelHistorical"
          :thresholds="thresholds"
          :title="`Resumen Operativo ${nivelLabel}`"
        />
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="8" class="pt-2 pt-md-4 order-1 order-md-2 d-flex flex-column">
      <v-card class="bg-background w-100 d-flex flex-column" elevation="2">
        <v-card-text>
          <v-sheet class="pa-2">
            <ForecastChartNew
              :data="nivelChartData"
              :height="470"
              :loading="loadingNivel"
              :thresholds="thresholds"
              :caudal-unit="nivelUnit"
              threshold-kind="nivel"
              :focus-threshold-request="thresholdFocusRequest"
              @focus-threshold-complete="handleThresholdFocusComplete"
            />
          </v-sheet>
        </v-card-text>
      </v-card>

      <v-card class="mt-2 pa-2 bg-background" elevation="2">
        <ContentUmbralesData
          active-tab="nivel"
          :thresholds="thresholds"
          :selected-threshold="selectedThreshold"
          :nivel-label="nivelLabel"
          :nivel-unit="nivelUnit"
          @focus-threshold="handleThresholdFocus"
        />
      </v-card>
    </v-col>

    <v-col
      cols="12"
      md="3"
      lg="2"
      class="order-3 order-md-3 d-flex flex-column pl-0"
      style="min-height: 0"
    >
      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihAlertStatus
          active-tab="nivel"
          mode="predictions"
          :loading="loadingNivel"
          :thresholds="thresholds"
        />
      </v-card>

      <v-card class="ma-2 pa-2 bg-background w-100 flex-shrink-0" elevation="2">
        <ContentSaihPredictionsLatest
          class="ma-2"
          active-tab="nivel"
          :loading="loadingNivel"
          :hide-date-selector="true"
          :thresholds="thresholds"
          :nivel-unit="nivelUnit"
        />
      </v-card>

      <v-card
        class="ma-2 mt-0 pa-2 bg-background w-100 flex-grow-1 d-flex flex-column"
        elevation="2"
      >
        <ContentSaihOperationalSummary
          :loading="loadingNivel"
          mode="predictions"
          :thresholds="thresholds"
          title="Resumen Operativo Predicciones"
        />
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import type { StationPrediction } from '@/types/Predictions'
  import { getHistoricalPredictionService } from '@/services/predictions'
  import ForecastChartNew from '../charts/ForecastChartNew.vue'
  import ContentSaihAlertStatus from './ContentSaih/ContentSaihAlertStatus.vue'
  import ContentObservedData from './ContentSaih/ContentObservedData.vue'
  import ContentSaihOperationalSummary from './ContentSaih/ContentSaihOperationalSummary.vue'
  import ContentUmbralesData from './ContentSaih/ContentUmbralesData.vue'
  import ContentSaihPredictionsLatest from './ContentSaih/ContentSaihPredictionsLatest.vue'
  import { getNivelStationConfig } from '@/config/nivelStations'

  const HISTORICAL_RANGE_DAYS = 10

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
    normalizedStationCode: string
    thresholds?: Record<string, unknown>
  }>()

  const loadingNivel = ref(false)
  const nivelHistorical = ref<StationPrediction>()

  const nivelConfig = computed(() => getNivelStationConfig(props.normalizedStationCode))
  const nivelLabel = computed(() => nivelConfig.value?.label ?? 'Nivel')
  const nivelUnit = computed(() => nivelConfig.value?.unit ?? 'm')

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

  // Temporary debug aid — logs the raw thresholds prop plus the dedicated
  // umbral_nivel_* fields the Nivel tab's chart/chips read, and the
  // umbral_caudal_* ones the Hidrogramas tab reads off the SAME prop, so
  // it's visible in the console that they no longer share values (they used
  // to, via a fallback in RightContentSaih's stationToFeature that treated
  // a station's umbralNivel* as a stand-in for a missing umbralCaudal* —
  // wrong, since they're different physical quantities/units).
  watch(
    () => props.thresholds,
    (value) => {
      console.log('[ContentSaihTabNivel] thresholds prop:', value)
      console.log('[ContentSaihTabNivel] nivel (m) vs caudal (m3/s) thresholds:', {
        umbral_nivel_1: value?.umbral_nivel_1,
        umbral_nivel_2: value?.umbral_nivel_2,
        umbral_nivel_3: value?.umbral_nivel_3,
        umbral_caudal_1: value?.umbral_caudal_1,
        umbral_caudal_2: value?.umbral_caudal_2,
        umbral_caudal_3: value?.umbral_caudal_3,
      })
    },
    { immediate: true }
  )

  const nivelChartData = computed(() => ({
    historical: nivelHistorical.value,
  }))

  let fetchRequestId = 0

  async function refreshNivel(code: string): Promise<void> {
    const requestId = ++fetchRequestId
    loadingNivel.value = true

    const historicalEnd = new Date().toISOString()
    const historicalStart = new Date(
      Date.now() - HISTORICAL_RANGE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()

    const predictionType = getNivelStationConfig(code)?.predictionType
    if (!predictionType) {
      nivelHistorical.value = undefined
      loadingNivel.value = false
      return
    }

    try {
      const historical = await getHistoricalPredictionService(
        code,
        predictionType,
        historicalStart,
        historicalEnd
      )
      if (requestId !== fetchRequestId) return
      nivelHistorical.value = historical
    } catch (err) {
      console.error('Error loading nivel historical:', err)
      if (requestId !== fetchRequestId) return
      nivelHistorical.value = undefined
    } finally {
      if (requestId === fetchRequestId) loadingNivel.value = false
    }
  }

  watch(
    () => props.normalizedStationCode,
    (code) => {
      if (!code) {
        nivelHistorical.value = undefined
        loadingNivel.value = false
        return
      }
      refreshNivel(code)
    },
    { immediate: true }
  )
</script>
