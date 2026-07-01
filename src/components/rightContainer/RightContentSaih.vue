<template>
  <StationStickyHeader
    :feature="feature"
    :loading="loadingFeature"
    :header-style="topHeaderStyle"
    @close="closeDrawer"
  />

  <v-progress-linear v-if="loadingFeature" indeterminate />
  <v-alert v-if="error" type="error" variant="tonal" class="ma-2">
    {{ error }}
  </v-alert>

  <v-sheet elevation="2" class="mt-2">
    <v-tabs v-model="tab" color="primary">
      <v-tab v-if="hasCaudal" value="caudal">Hidrogramas</v-tab>
      <v-tab value="precipitaciones">Precipitaciones</v-tab>
    </v-tabs>
  </v-sheet>

  <div v-if="tab === 'caudal'" class="bg-surface">
    <ContentSaihTabHidrograma
      :is-embalse="isEmbalse"
      :normalized-station-code="normalizedStationCode"
      :thresholds="feature?.properties as Record<string, unknown>"
    />
  </div>

  <div v-else class="bg-surface">
    <ContentSaihTabPrecipitaciones
      :normalized-station-code="normalizedStationCode"
      :thresholds="feature?.properties as Record<string, unknown>"
    />
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { getStationByCodeService, type StationByCodeResponse } from '@/services/general'
  import { getSaihTypeColor } from '@/utils/saihStations'
  import StationStickyHeader from './StationStickyHeader.vue'
  import {
    aforosWithCaudalPredictions,
    embalsesWithCaudalPredictions,
  } from '@/constants/predictionsAvailableData'
  import ContentSaihTabHidrograma from './ContentSaihTabHidrograma.vue'
  import ContentSaihTabPrecipitaciones from './ContentSaihTabPrecipitaciones.vue'

  const route = useRoute()
  const router = useRouter()

  const feature = ref<GeoJSON.Feature | null>(null)
  const loadingFeature = ref(false)
  const error = ref<string | null>(null)

  // station desde la URL
  const stationCode = computed(() => route.query.station as string | undefined)

  const codeType = computed(() => feature.value?.properties?.tipoCod)

  function hexToRgb(hex: string): [number, number, number] {
    const value = hex.replace('#', '')
    const full =
      value.length === 3
        ? value
            .split('')
            .map((c) => c + c)
            .join('')
        : value
    const num = Number.parseInt(full, 16)

    return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
  }

  function shadeHex(hex: string, factor: number): string {
    const [r, g, b] = hexToRgb(hex)
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

    const rr = clamp(r * factor)
    const gg = clamp(g * factor)
    const bb = clamp(b * factor)

    return `rgb(${rr}, ${gg}, ${bb})`
  }

  const stationBaseColor = computed(() => getSaihTypeColor(codeType.value as string | undefined))

  const headerStyle = computed(() => {
    const base = stationBaseColor.value
    const darker = shadeHex(base, 0.72)

    return {
      background: `linear-gradient(135deg, ${base} 0%, ${darker} 100%)`,
    }
  })

  const topHeaderStyle = computed(() => {
    if (feature.value) return headerStyle.value

    return {
      background: 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)',
    }
  })

  const stationsWithCaudalPredictions = new Set([
    ...aforosWithCaudalPredictions,
    ...embalsesWithCaudalPredictions,
  ])

  const normalizedStationCode = computed(() => {
    const featureProperties = (feature.value?.properties ?? {}) as Record<string, unknown>
    const featureCode = featureProperties.stationCode ?? featureProperties.codigo
    const sourceCode = typeof featureCode === 'string' ? featureCode : stationCode.value

    return sourceCode?.trim().toUpperCase() ?? ''
  })

  const hasCaudal = computed(() => stationsWithCaudalPredictions.has(normalizedStationCode.value))
  const embalseCodes = new Set(embalsesWithCaudalPredictions)
  const isEmbalse = computed(() => embalseCodes.has(normalizedStationCode.value))

  const tab = ref<'caudal' | 'precipitaciones'>(hasCaudal.value ? 'caudal' : 'precipitaciones')

  let featureRequestId = 0

  function getThresholdValue(
    threshold: StationByCodeResponse['threshold'],
    keys: Array<
      | 'umbralNivel1'
      | 'umbralNivel2'
      | 'umbralNivel3'
      | 'umbralCaudal1'
      | 'umbralCaudal2'
      | 'umbralCaudal3'
      | 'umbralVolumen1'
      | 'umbralVolumen2'
      | 'umbralVolumen3'
    >
  ): number | null {
    if (!threshold) return null

    for (const key of keys) {
      const raw = threshold[key]
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw
    }

    return null
  }

  function stationToFeature(station: StationByCodeResponse): GeoJSON.Feature {
    const hasValidCoordinates =
      station.latitude != null &&
      station.longitude != null &&
      Number.isFinite(station.latitude) &&
      Number.isFinite(station.longitude)

    const longitude = hasValidCoordinates ? (station.longitude as number) : 0
    const latitude = hasValidCoordinates ? (station.latitude as number) : 0

    return {
      type: 'Feature',
      id: station.id,
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      properties: {
        ...station,
        codigo: station.stationCode,
        nombre: station.name,
        tipo: 'SAIH',
        tipo_cod: station.tipoCod ?? null,
        threshold: station.threshold ?? null,
        umbral_caudal_1: getThresholdValue(station.threshold, ['umbralCaudal1', 'umbralNivel1', 'umbralVolumen1']),
        umbral_caudal_2: getThresholdValue(station.threshold, ['umbralCaudal2', 'umbralNivel2', 'umbralVolumen2']),
        umbral_caudal_3: getThresholdValue(station.threshold, ['umbralCaudal3', 'umbralNivel3', 'umbralVolumen3']),
        umbral_cauda_1: getThresholdValue(station.threshold, ['umbralCaudal1', 'umbralNivel1', 'umbralVolumen1']),
        umbral_cauda_2: getThresholdValue(station.threshold, ['umbralCaudal2', 'umbralNivel2', 'umbralVolumen2']),
        umbral_cauda_3: getThresholdValue(station.threshold, ['umbralCaudal3', 'umbralNivel3', 'umbralVolumen3']),
        umbral_amarillo: getThresholdValue(station.threshold, ['umbralCaudal1', 'umbralNivel1', 'umbralVolumen1']),
        umbral_naranja: getThresholdValue(station.threshold, ['umbralCaudal2', 'umbralNivel2', 'umbralVolumen2']),
        umbral_rojo: getThresholdValue(station.threshold, ['umbralCaudal3', 'umbralNivel3', 'umbralVolumen3']),
      },
    }
  }

  // cargar feature
  async function loadFeature(code: string): Promise<boolean> {
    if (!code) {
      error.value = 'Station code is required'
      return false
    }

    const requestId = ++featureRequestId
    loadingFeature.value = true
    error.value = null

    try {
      const station = await getStationByCodeService(code)
      const result = stationToFeature(station)

      if (requestId !== featureRequestId) {
        return false
      }

      if (!result) {
        error.value = 'Feature not found'
        feature.value = null
        return false
      }

      feature.value = result
      tab.value = hasCaudal.value ? 'caudal' : 'precipitaciones'
      return true
    } catch (err) {
      console.error('Error loading feature:', err)
      error.value = 'Error loading feature'
      feature.value = null
      return false
    } finally {
      if (requestId === featureRequestId) {
        loadingFeature.value = false
      }
    }
  }

  watch(
    stationCode,
    async (code) => {
      feature.value = null
      error.value = null
      if (!code) {
        loadingFeature.value = false
        return
      }
      await loadFeature(code)
    },
    { immediate: true }
  )

  function closeDrawer() {
    if (!route.query.station) return

    const query = { ...route.query }
    delete query.station

    router.replace({ query })
  }
</script>

<style scoped>
  .chart-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chart-placeholder--caudal {
    min-height: 510px;
  }

  .chart-placeholder--precip {
    min-height: 510px;
  }

  .chart-placeholder--percentiles {
    min-height: 160px;
  }

  @media (max-width: 960px) {
    .chart-placeholder--caudal {
      min-height: 260px;
    }

    .chart-placeholder--precip {
      min-height: 260px;
    }
  }
</style>
