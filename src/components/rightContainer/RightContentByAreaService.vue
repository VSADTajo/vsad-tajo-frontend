<template>
  <StationStickyHeader
    :feature="displayFeature"
    :loading="loadingFeature"
    :header-style="topHeaderStyle"
    @close="closeDrawer"
  >
    <v-chip
      v-if="selectedRouteValue"
      prepend-icon="mdi-shape"
      variant="tonal"
      color="white"
      size="small"
      class="font-weight-bold"
    >
      {{ kindLabel }}
    </v-chip>
  </StationStickyHeader>

  <v-card class="pa-2 bg-background" elevation="2">
    <v-progress-linear v-if="loadingFeature" indeterminate />

    <template v-if="loadingFeature">
      <div class="pa-4">
        <v-skeleton-loader type="heading" height="28" class="mb-2" />
        <v-skeleton-loader type="text" height="18" class="mb-2" />
        <v-skeleton-loader type="list-item" class="mb-2" />
      </div>
    </template>

    <template v-else-if="selectedRouteValue">
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="4">
            <v-card>
              <MapDetail
                :type="mapType"
                :stations="stations"
                :selected-station-code="selectedStationCode"
                :hovered-station-code="hoveredStationCode"
                @update:selected-station-code="selectedStationCode = $event"
                @update:hovered-station-code="hoveredStationCode = $event"
              />
            </v-card>
          </v-col>

          <v-col cols="12" sm="8">
            <template v-if="hasPrecipAreal">
              <v-tabs v-model="selectedTab" class="bg-surface">
                <v-tab value="precipitacion">Precipitación Areal</v-tab>
                <v-tab value="estaciones">Estaciones</v-tab>
              </v-tabs>

              <v-window v-model="selectedTab">
                <v-window-item value="precipitacion">
                  <PrecipitationsChart
                    :data="precipArealData"
                    :height="415"
                    :loading="false"
                    mode="precipitations"
                    class="bg-surface border-radius-4"
                  />
                </v-window-item>

                <v-window-item value="estaciones">
                  <v-card>
                    <ByAreaStationsTable
                      :stations="stations"
                      :loading="loadingStations"
                      :selected-station-code="selectedStationCode"
                      :hovered-station-code="hoveredStationCode"
                      @update:selected-station-code="selectedStationCode = $event"
                      @update:hovered-station-code="hoveredStationCode = $event"
                    />
                  </v-card>
                </v-window-item>
              </v-window>
            </template>

            <v-card v-else>
              <ByAreaStationsTable
                :stations="stations"
                :loading="loadingStations"
                :height="380"
                :selected-station-code="selectedStationCode"
                :hovered-station-code="hoveredStationCode"
                @update:selected-station-code="selectedStationCode = $event"
                @update:hovered-station-code="hoveredStationCode = $event"
              />
            </v-card>
          </v-col>
        </v-row>

        <v-row
          v-if="hasPrecipAreal && selectedTab === 'precipitacion'"
          class="mt-2"
          align="stretch"
        >
          <v-col cols="12" sm="3" class="d-flex flex-column">
            <ContentObservedData
              class="flex-grow-1"
              active-tab="precipitaciones"
              :loading="false"
              :precipitations-historical="precipArealData.historical"
              :accum-days="3"
            />
          </v-col>
          <v-col cols="12" sm="6" class="d-flex flex-column">
            <ContentSaihCaudalMatrix
              class="flex-grow-1"
              :forecast-harmonie="precipArealData.forecastHarmonie"
              :forecast-epsat="precipArealData.forecastEpsat"
              :observed="precipArealData.historical"
              :days="6"
              :loading="false"
              :no-thresholds="true"
              title="Matriz de precipitación (6 dias / 6h)"
            />
          </v-col>
          <v-col cols="12" sm="3" class="d-flex flex-column">
            <ContentSaihPredictionsLatest
              class="flex-grow-1"
              active-tab="precipitaciones"
              :loading="false"
              :loading-harmonie="false"
              :loading-eps="false"
              :hide-date-selector="true"
              :precipitations-forecast-harmonie="precipArealData.forecastHarmonie"
              :precipitations-forecast-epstat="precipArealData.forecastEpsat"
            />
          </v-col>
        </v-row>

        <v-row v-if="!hasPrecipAreal || selectedTab === 'estaciones'" class="mt-2">
          <v-col cols="12">
            <v-card class="pa-2 bg-background" elevation="2">
              <template
                v-if="
                  (selectedSeries === 'caudal' && !!selectedStationCode) ||
                  loadingChart ||
                  selectedChartData
                "
              >
                <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
                  {{
                    selectedSeries === 'caudal'
                      ? `Caudal - ${selectedStationName}`
                      : `Precipitación - ${selectedStationName}`
                  }}
                </v-card-title>

                <v-card-text class="bg-surface mt-2 border-radius-4" elevation="2">
                  <template v-if="selectedSeries === 'caudal'">
                    <template v-if="isEmbalseForChart">
                      <v-tabs v-model="selectedEmbalseChartTab" density="compact" class="mb-3">
                        <v-tab value="caudalNAM">Caudal NAM</v-tab>
                        <v-tab value="caudalMIKE">Caudal MIKE</v-tab>
                        <v-tab value="volumenNAM">Volumen NAM</v-tab>
                        <v-tab value="volumenMIKE">Volumen MIKE</v-tab>
                      </v-tabs>

                      <div class="chart-tab-root">
                        <div
                          :class="[
                            'chart-tab-panel',
                            { 'chart-tab-panel--hidden': selectedEmbalseChartTab !== 'caudalNAM' },
                          ]"
                        >
                          <ForecastChartNew
                            v-if="mountedTabs.has('caudalNAM')"
                            :data="caudalChartData"
                            :is-embalse="true"
                            :height="470"
                            :loading="loadingCaudales"
                            :thresholds="currentStationThresholds"
                            :focus-threshold-request="thresholdFocusRequest"
                            @focus-threshold-complete="handleThresholdFocusComplete"
                          />
                        </div>
                        <div
                          :class="[
                            'chart-tab-panel',
                            'chart-tab-overlay',
                            { 'chart-tab-panel--hidden': selectedEmbalseChartTab !== 'caudalMIKE' },
                          ]"
                        >
                          <ForecastChartNew
                            v-if="mountedTabs.has('caudalMIKE')"
                            :data="mikeChartData"
                            :is-embalse="true"
                            :height="470"
                            :loading="loadingCaudales"
                            :thresholds="currentStationThresholds"
                            :focus-threshold-request="thresholdFocusRequest"
                            @focus-threshold-complete="handleThresholdFocusComplete"
                          />
                        </div>
                        <div
                          :class="[
                            'chart-tab-panel',
                            'chart-tab-overlay',
                            { 'chart-tab-panel--hidden': selectedEmbalseChartTab !== 'volumenNAM' },
                          ]"
                        >
                          <ForecastChartNew
                            v-if="mountedTabs.has('volumenNAM')"
                            :data="volumenOnlyChartData"
                            :is-embalse="true"
                            :height="470"
                            :loading="loadingCaudales"
                            :thresholds="currentStationThresholds"
                            :focus-threshold-request="thresholdFocusRequest"
                            @focus-threshold-complete="handleThresholdFocusComplete"
                          />
                        </div>
                        <div
                          :class="[
                            'chart-tab-panel',
                            'chart-tab-overlay',
                            {
                              'chart-tab-panel--hidden': selectedEmbalseChartTab !== 'volumenMIKE',
                            },
                          ]"
                        >
                          <ForecastChartNew
                            v-if="mountedTabs.has('volumenMIKE')"
                            :data="mikeVolumenChartData"
                            :is-embalse="true"
                            :height="470"
                            :loading="loadingCaudales"
                            :thresholds="currentStationThresholds"
                            :focus-threshold-request="thresholdFocusRequest"
                            @focus-threshold-complete="handleThresholdFocusComplete"
                          />
                        </div>
                      </div>
                    </template>

                    <template v-else>
                      <v-tabs v-model="selectedCaudalTypeChartTab" density="compact" class="mb-3">
                        <v-tab value="nam">NAM</v-tab>
                        <v-tab value="mike">MIKE</v-tab>
                        <v-tab value="combined">NAM + MIKE</v-tab>
                      </v-tabs>
                      <div class="chart-tab-root">
                        <div
                          :class="[
                            'chart-tab-panel',
                            { 'chart-tab-panel--hidden': selectedCaudalTypeChartTab !== 'nam' },
                          ]"
                        >
                          <ForecastChartNew
                            v-if="mountedTabs.has('nam')"
                            :data="caudalChartData"
                            :loading="loadingCaudales"
                            :thresholds="currentStationThresholds"
                            :height="470"
                            :focus-threshold-request="thresholdFocusRequest"
                            @focus-threshold-complete="handleThresholdFocusComplete"
                          />
                        </div>
                        <div
                          :class="[
                            'chart-tab-panel',
                            'chart-tab-overlay',
                            { 'chart-tab-panel--hidden': selectedCaudalTypeChartTab !== 'mike' },
                          ]"
                        >
                          <ForecastChartNew
                            v-if="mountedTabs.has('mike')"
                            :data="mikeChartData"
                            :loading="loadingCaudales"
                            :thresholds="currentStationThresholds"
                            :height="470"
                            :focus-threshold-request="thresholdFocusRequest"
                            @focus-threshold-complete="handleThresholdFocusComplete"
                          />
                        </div>
                        <div
                          :class="[
                            'chart-tab-panel',
                            'chart-tab-overlay',
                            {
                              'chart-tab-panel--hidden': selectedCaudalTypeChartTab !== 'combined',
                            },
                          ]"
                        >
                          <CombinedNamMikeChart
                            v-if="mountedTabs.has('combined')"
                            :historical="caudalHistorical"
                            :nam-harmonie="caudalForecastHarmonie"
                            :nam-eps="caudalForecastEpstat"
                            :mike-harmonie="mikeForecastHarmonie"
                            :mike-eps="mikeForecastEpsat"
                            :thresholds="currentStationThresholds"
                            :loading="loadingCaudales"
                            :height="470"
                            :focus-threshold-request="thresholdFocusRequest"
                            @focus-threshold-complete="handleThresholdFocusComplete"
                          />
                        </div>
                      </div>
                    </template>
                  </template>

                  <div v-else>
                    <v-tabs v-model="selectedPrecipChartTab" class="bg-surface px-2">
                      <v-tab value="precipitaciones">Precipitaciones</v-tab>
                      <v-tab value="acumuladas">Acumuladas</v-tab>
                    </v-tabs>

                    <v-window v-model="selectedPrecipChartTab" class="flex-grow-1">
                      <v-window-item value="precipitaciones" class="h-100">
                        <v-sheet class="pa-2 h-100 d-flex flex-column">
                          <PrecipitationsChart
                            :data="selectedChartData ?? {}"
                            :height="450"
                            :loading="loadingChart"
                            mode="precipitations"
                          />
                        </v-sheet>
                      </v-window-item>

                      <v-window-item value="acumuladas" class="h-100">
                        <v-sheet class="pa-2 h-100 d-flex flex-column">
                          <PrecipAccumulatedTimeSeriesChart
                            :precipitations-historical="selectedChartData?.historical"
                            :precipitations-forecast-harmonie="selectedChartData?.forecastHarmonie"
                            :precipitations-forecast-epstat="selectedChartData?.forecastEpsat"
                            :height="450"
                            :loading="loadingChart"
                          />
                        </v-sheet>
                      </v-window-item>
                    </v-window>
                  </div>
                </v-card-text>
              </template>

              <v-card-text
                v-else
                class="bg-surface mt-2 d-flex align-center justify-center text-medium-emphasis"
                style="height: 360px"
              >
                Selecciona una estación en la tabla para ver su gráfica.
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </template>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import type { DataStationPrediction, PredictionTypeName } from '@/types/Predictions'
  import {
    useSubcuencaSelectionBus,
    type SubcuencaSeriesMode,
  } from '@/composables/useSubcuencaSelectionBus'
  import ForecastChartNew from '../charts/ForecastChartNew.vue'
  import PrecipitationsChart from '../charts/PrecipitationsChart.vue'
  import PrecipAccumulatedTimeSeriesChart from '../charts/PrecipAccumulatedTimeSeriesChart.vue'
  import CombinedNamMikeChart from '../charts/CombinedNamMikeChart.vue'
  import { useCaudalPredictions } from '@/composables/useCaudalPredictions'
  import MapDetail from './MapDetail.vue'
  import ByAreaStationsTable from './ByAreaStationsTable.vue'
  import StationStickyHeader from './StationStickyHeader.vue'
  import ContentObservedData from './ContentSaih/ContentObservedData.vue'
  import ContentSaihPredictionsLatest from './ContentSaih/ContentSaihPredictionsLatest.vue'
  import ContentSaihCaudalMatrix from './ContentSaih/ContentSaihCaudalMatrix.vue'
  import { getWFSFeatureById } from '@/services/geoserver'
  import { dynamicLayersConfig } from '@/config/layers.config'
  import type { WFSLayerConfig } from '@/types/Layers'
  import type { StationData } from '@/utils/stationsToGeoJSON'
  import {
    getAvailablePredictionsService,
    getHistoricalPredictionService,
    getPredictionsService,
  } from '@/services/predictions'
  import { getStationsByAreaService } from '@/services/general'
  import type { PredictionResult } from '@/types/Predictions'
  import epsJson from '@/MOCKUPS/json/tagus_eps_Pareal_202607140000.json'
  import harmonieJson from '@/MOCKUPS/json/tagus_harmonie_Pareal_202607140000.json'
  import saihJson from '@/MOCKUPS/json/tagus_saih_Pareal_202607140000.json'
  import {
    subcuencasStyle,
    sistemas10Style,
    zonasexplStyle,
    zonasmeteoalertaStyle,
  } from '@/config/styles/layerStyles'

  const props = withDefaults(
    defineProps<{
      kind?: 'subcuenca' | 'sistema' | 'zona' | 'meteoalerta' | 'comarca'
    }>(),
    { kind: 'subcuenca' }
  )

  const route = useRoute()
  const router = useRouter()
  const selectionBus = useSubcuencaSelectionBus()

  // ── State ─────────────────────────────────────────────────────────────────

  const loadingFeature = ref(false)
  const loadingStations = ref(false)
  const loadingChart = ref(false)

  const feature = ref<GeoJSON.Feature | null>(null)
  const stations = ref<StationData[]>([])

  const selectedStationCode = ref<string | null>(null)
  const hoveredStationCode = ref<string | null>(null)
  const selectedChartData = ref<DataStationPrediction | null>(null)

  const selectedTab = ref<'precipitacion' | 'estaciones'>('precipitacion')
  const selectedSeries = ref<SubcuencaSeriesMode>('caudal')
  const selectedPrecipChartTab = ref<'precipitaciones' | 'acumuladas'>('precipitaciones')
  const selectedStationName = ref('')
  const selectedEmbalseChartTab = ref<'caudalNAM' | 'caudalMIKE' | 'volumenNAM' | 'volumenMIKE'>(
    'caudalNAM'
  )
  const selectedCaudalTypeChartTab = ref<'nam' | 'mike' | 'combined'>('nam')
  const mountedTabs = reactive(new Set<string>(['caudalNAM', 'nam']))
  const thresholdFocusRequest = ref<null>(null)

  let stationsRequestId = 0
  let chartFetchId = 0

  // ── Computeds ─────────────────────────────────────────────────────────────

  const routeKey = computed(() => {
    if (props.kind === 'sistema') return 'sistema'
    if (props.kind === 'zona') return 'zona'
    if (props.kind === 'meteoalerta') return 'meteoalerta'
    if (props.kind === 'comarca') return 'comarca'
    return 'subcuenca'
  })

  const selectedRouteValue = computed(() => {
    const value = route.query[routeKey.value]
    return typeof value === 'string' ? value : undefined
  })

  const hasPrecipAreal = computed(
    () => props.kind === 'subcuenca' || props.kind === 'sistema' || props.kind === 'meteoalerta'
  )

  const kindLabel = computed(() => {
    if (props.kind === 'sistema') return 'Sistema'
    if (props.kind === 'zona') return 'Zona'
    if (props.kind === 'meteoalerta') return 'Zonas Meteoalerta'
    return 'Subcuenca'
  })

  const mapType = computed(() => {
    if (props.kind === 'sistema') return 'sistemas10'
    if (props.kind === 'zona') return 'zonasexpl'
    if (props.kind === 'meteoalerta') return 'meteoalerta'
    return 'subcuencas'
  })

  const wfsFieldName = computed(() => {
    if (props.kind === 'sistema') return 'sistema'
    if (props.kind === 'meteoalerta') return 'cod_z'
    if (props.kind === 'zona') return 'ogc_fid'
    return 'code'
  })

  const layerConfig = computed(() => {
    const idMap: Record<string, string> = {
      sistema: 'sistemas10',
      zona: 'zonasexpl',
      meteoalerta: 'meteoalerta',
      subcuenca: 'subcuencas',
    }
    return dynamicLayersConfig.find((l) => l.id === idMap[props.kind]) as WFSLayerConfig | undefined
  })

  const headerBaseColor = computed(() => {
    if (props.kind === 'sistema') return sistemas10Style.normal.fillColor ?? '#000000'
    if (props.kind === 'zona') return zonasexplStyle.normal.fillColor ?? '#000000'
    if (props.kind === 'meteoalerta') return zonasmeteoalertaStyle.normal.fillColor ?? '#000000'
    return subcuencasStyle.normal.fillColor ?? '#000000'
  })

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

  function darkenHex(hex: string, factor: number): string {
    const [r, g, b] = hexToRgb(hex)
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
    return `rgb(${clamp(r * factor)}, ${clamp(g * factor)}, ${clamp(b * factor)})`
  }

  const topHeaderStyle = computed(() => {
    const base = headerBaseColor.value
    const dark = darkenHex(base, 0.72)
    return { background: `linear-gradient(135deg, ${base} 0%, ${dark} 100%)` }
  })

  const displayFeature = computed<GeoJSON.Feature | null>(() => {
    if (!feature.value) return null
    const p = (feature.value.properties ?? {}) as Record<string, unknown>
    let codigo: string
    let nombre: string
    if (props.kind === 'sistema') {
      codigo = String(p.fid ?? selectedRouteValue.value ?? '')
      nombre = String(p.sistema ?? '')
    } else if (props.kind === 'zona') {
      codigo = String(p.nombre ?? selectedRouteValue.value ?? '')
      nombre = ''
    } else if (props.kind === 'meteoalerta') {
      codigo = String(p.nom_z ?? selectedRouteValue.value ?? '')
      nombre = ''
    } else {
      codigo = String(p.code ?? selectedRouteValue.value ?? '')
      nombre = String(p.name ?? '')
    }
    let extraProps: Record<string, unknown> = {}
    if (props.kind === 'sistema' || props.kind === 'zona') {
      extraProps = { area: p.areakm2 ?? undefined, perimetro: p.perkm ?? undefined }
    } else if (props.kind === 'meteoalerta') {
      extraProps = {
        area: p.area_km2 ?? undefined,
        ccaa: p.nom_ccaa ?? undefined,
        provincia: p.nom_prov ?? undefined,
      }
    }
    return { ...feature.value, properties: { ...p, codigo, nombre, ...extraProps } }
  })

  const currentStationThresholds = computed<Record<string, unknown> | undefined>(() => {
    if (!selectedStationCode.value) return undefined
    const station = stations.value.find((s) => s.stationCode === selectedStationCode.value)
    return (station?.threshold ?? null) as Record<string, unknown> | undefined
  })

  // ── Caudal predictions ────────────────────────────────────────────────────

  const isEmbalseForChart = computed(
    () =>
      (
        stations.value.find((s) => s.stationCode === selectedStationCode.value)?.tipoCod ?? ''
      ).toUpperCase() === 'E'
  )

  const codeTypeForChart = computed(
    () =>
      stations.value.find((s) => s.stationCode === selectedStationCode.value)?.tipoCod ?? undefined
  )

  const {
    caudalHistorical,
    caudalForecastHarmonie,
    caudalForecastEpstat,
    caudalForecastEnsP10,
    caudalForecastEnsP25,
    caudalForecastEnsP75,
    caudalForecastEnsP90,
    caudalOutflowHistorical,
    embalseVolumeHistorical,
    mikeForecastHarmonie,
    mikeForecastEpsat,
    mikeChartData,
    mikeVolumeHarmonie,
    mikeVolumeEpsat,
    mikeVolumeEnsP25,
    mikeVolumeEnsP75,
    loading: loadingCaudales,
  } = useCaudalPredictions(
    computed(() => selectedStationCode.value ?? ''),
    isEmbalseForChart,
    codeTypeForChart
  )

  const caudalChartData = computed(() => ({
    historical: caudalHistorical.value,
    historicalOutflow: caudalOutflowHistorical.value,
    forecastHarmonie: caudalForecastHarmonie.value,
    forecastEpsat: caudalForecastEpstat.value,
    forecastEnsP10: caudalForecastEnsP10.value,
    forecastEnsP25: caudalForecastEnsP25.value,
    forecastEnsP90: caudalForecastEnsP90.value,
    forecastEnsP75: caudalForecastEnsP75.value,
  }))

  const volumenOnlyChartData = computed(() => ({
    historicalVolume: embalseVolumeHistorical.value,
  }))

  const mikeVolumenChartData = computed(() => ({
    historicalVolume: embalseVolumeHistorical.value,
    forecastHarmonie: mikeVolumeHarmonie.value,
    forecastEpsat: mikeVolumeEpsat.value,
    forecastEnsP25: mikeVolumeEnsP25.value,
    forecastEnsP75: mikeVolumeEnsP75.value,
  }))

  function handleThresholdFocusComplete(): void {}

  // ── Precipitación Areal (mockup FEWS data) ────────────────────────────────

  type FewsEvent = { date: string; time: string; value: string; flag: string }
  type FewsTimeSeries = {
    header: { locationId: string; parameterId: string; missVal: string }
    events: FewsEvent[]
  }
  type FewsFile = { timeSeries: FewsTimeSeries[] }

  const precipArealLocationId = computed<string | null>(() => {
    if (!feature.value) return null
    const p = (feature.value.properties ?? {}) as Record<string, unknown>
    if (props.kind === 'sistema') {
      const fid = p.fid ?? p.id
      return fid != null ? `Sistema.Tajo.${fid}` : null
    }
    const code = p.code ?? p.cuencasname ?? p.name
    return code != null ? `Cuenca.NAM.${code}` : null
  })

  function fewsToStationPrediction(
    file: FewsFile,
    locationId: string,
    parameterId: string
  ): import('@/types/Predictions').StationPrediction | undefined {
    const series = file.timeSeries.find(
      (s) => s.header.locationId === locationId && s.header.parameterId === parameterId
    )
    if (!series) return undefined

    const missVal = series.header.missVal
    const results: PredictionResult[] = series.events
      .filter((e) => e.value !== missVal)
      .map((e, i) => ({
        id: i,
        date: `${e.date}T${e.time}Z`,
        value: parseFloat(e.value),
        flag: parseInt(e.flag),
      }))

    return {
      id: `${locationId}-${parameterId}`,
      stationId: locationId,
      stationName: locationId,
      predictionTypeName: parameterId,
      simulationDate: new Date().toISOString(),
      predictionDate: new Date().toISOString(),
      predictionProvider: 'FEWS',
      predictedBy: 'mockup',
      results,
    }
  }

  const precipArealData = computed<DataStationPrediction>(() => {
    const locId = precipArealLocationId.value
    if (!locId) return {}

    const suffix = props.kind === 'sistema' ? 'sis10' : 'subcNAM'
    const saihFile = saihJson as unknown as FewsFile
    const harmonieFile = harmonieJson as unknown as FewsFile
    const epsFile = epsJson as unknown as FewsFile

    return {
      historical: fewsToStationPrediction(saihFile, locId, `P.areal.obs.${suffix}.1h.v`),
      forecastHarmonie: fewsToStationPrediction(harmonieFile, locId, `P.areal.harmonie.${suffix}`),
      forecastEpsat: fewsToStationPrediction(epsFile, locId, `P.areal.ens.${suffix}.Med`),
    }
  })

  // ── Watchers ──────────────────────────────────────────────────────────────

  watch(selectedEmbalseChartTab, (tab) => mountedTabs.add(tab))
  watch(selectedCaudalTypeChartTab, (tab) => mountedTabs.add(tab))

  watch(selectedStationCode, () => {
    selectedEmbalseChartTab.value = 'caudalNAM'
    selectedCaudalTypeChartTab.value = 'nam'
    mountedTabs.clear()
    mountedTabs.add('caudalNAM')
    mountedTabs.add('nam')
  })

  watch(
    selectedRouteValue,
    (code) => {
      selectedStationCode.value = null
      selectedChartData.value = null
      if (code) {
        void loadFeature(code)
      } else {
        feature.value = null
        stations.value = []
        loadingStations.value = false
      }
    },
    { immediate: true }
  )

  // ── Data loading ──────────────────────────────────────────────────────────

  function stationsSearchParams(
    feat: GeoJSON.Feature | null
  ): Parameters<typeof getStationsByAreaService>[0] | null {
    const p = (feat?.properties ?? {}) as Record<string, unknown>
    if (props.kind === 'subcuenca') {
      const name = String(p.cuencasname ?? p.cuencasName ?? p.name ?? p.nombre ?? '').trim()
      return name ? { subBasinName: name } : null
    }
    if (props.kind === 'sistema') {
      const name = String(p.sistema ?? p.systemName ?? p.name ?? p.nombre ?? '').trim()
      return name ? { sistemaName: name } : null
    }
    if (props.kind === 'zona') {
      const id = p.ogc_fid != null ? String(p.ogc_fid).trim() : ''
      return id ? { zonaExplOgcFid: id } : null
    }
    const id = p.cod_z != null ? String(p.cod_z).trim() : ''
    return id ? { meteoalertaZonaCode: id } : null
  }

  async function loadStations(feat: GeoJSON.Feature | null): Promise<void> {
    const requestId = ++stationsRequestId
    const params = stationsSearchParams(feat)

    if (!params) {
      stations.value = []
      loadingStations.value = false
      return
    }

    loadingStations.value = true
    try {
      const items = await getStationsByAreaService(params)
      if (requestId !== stationsRequestId) return
      stations.value = items
    } catch {
      if (requestId !== stationsRequestId) return
      stations.value = []
    } finally {
      if (requestId === stationsRequestId) loadingStations.value = false
    }
  }

  async function loadFeature(code: string): Promise<void> {
    if (!layerConfig.value) return
    feature.value = null
    stations.value = []
    loadingFeature.value = true
    try {
      feature.value = await getWFSFeatureById(layerConfig.value, wfsFieldName.value, code)
      console.log('[feature properties]', feature.value?.properties)
      await loadStations(feature.value)
    } catch {
      // feature.value and stations.value already reset above
    } finally {
      loadingFeature.value = false
    }
  }

  async function fetchChartData(stationCode: string): Promise<void> {
    const requestId = ++chartFetchId
    loadingChart.value = true
    selectedChartData.value = null

    const historicalType: PredictionTypeName = 'WI__01.historical'
    const harmonieType: PredictionTypeName = 'P.harmonie.forecast'
    const epsType: PredictionTypeName = 'P.ens.forecast'

    function latestDate(
      resp: Awaited<ReturnType<typeof getAvailablePredictionsService>>
    ): string | undefined {
      return [...(resp.simulationDates ?? []).map((d) => d.simulationDate), ...(resp.dates ?? [])]
        .filter((v): v is string => Boolean(v))
        .sort((a, b) => b.localeCompare(a))[0]
    }

    const now = new Date()
    const historicalEndDate = now.toISOString()
    const historicalStartDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()

    try {
      const [harmonieDates, epsDates] = await Promise.all([
        getAvailablePredictionsService(stationCode, harmonieType),
        getAvailablePredictionsService(stationCode, epsType),
      ])

      if (requestId !== chartFetchId) return

      const harmonieDateStr = latestDate(harmonieDates)
      const epsDateStr = latestDate(epsDates)

      const [harmoniePred, epsPred, historicalPred, p10Pred, p25Pred, p75Pred, p90Pred] =
        await Promise.all([
          harmonieDateStr
            ? getPredictionsService(stationCode, harmonieType, harmonieDateStr)
            : Promise.resolve(undefined),
          epsDateStr
            ? getPredictionsService(stationCode, epsType, epsDateStr)
            : Promise.resolve(undefined),
          getHistoricalPredictionService(
            stationCode,
            historicalType,
            historicalStartDate,
            historicalEndDate
          ),
          epsDateStr
            ? getPredictionsService(stationCode, epsType, epsDateStr, '10')
            : Promise.resolve(undefined),
          epsDateStr
            ? getPredictionsService(stationCode, epsType, epsDateStr, '25')
            : Promise.resolve(undefined),
          epsDateStr
            ? getPredictionsService(stationCode, epsType, epsDateStr, '75')
            : Promise.resolve(undefined),
          epsDateStr
            ? getPredictionsService(stationCode, epsType, epsDateStr, '90')
            : Promise.resolve(undefined),
        ])

      if (requestId !== chartFetchId) return

      selectedChartData.value = {
        historical: historicalPred,
        forecastHarmonie: harmoniePred,
        forecastEpsat: epsPred,
        forecastEnsP10: p10Pred,
        forecastEnsP25: p25Pred,
        forecastEnsP75: p75Pred,
        forecastEnsP90: p90Pred,
      }
    } catch {
      if (requestId === chartFetchId) selectedChartData.value = null
    } finally {
      if (requestId === chartFetchId) loadingChart.value = false
    }
  }

  // ── Bus & lifecycle ───────────────────────────────────────────────────────

  const stopBusListener = selectionBus.on((payload) => {
    selectedSeries.value = payload.series
    selectedStationName.value = payload.station?.nombre ?? ''

    if (!payload.station) {
      selectedChartData.value = null
      loadingChart.value = false
      return
    }

    if (payload.series === 'precipitacion') {
      void fetchChartData(payload.station.codigo)
    }
  })

  function closeDrawer() {
    if (!selectedRouteValue.value) return
    const query = { ...route.query }
    delete query[routeKey.value]
    router.replace({ query })
  }

  onBeforeUnmount(() => {
    stopBusListener()
  })
</script>

<style scoped>
  .chart-tab-root {
    position: relative;
  }

  .chart-tab-overlay {
    position: absolute;
    inset: 0;
  }

  .chart-tab-panel--hidden {
    visibility: hidden;
    pointer-events: none;
  }
</style>
