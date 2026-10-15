<template>
  <v-app-bar flat color="primary" class="px-4" app :location="mdAndUp ? 'top' : 'bottom'">
    <!-- BOTÓN MOBILE -->
    <mobile-navigation-menu v-if="!mdAndUp" />

    <v-toolbar-title class="text-h6 font-weight-bold">
      <div class="d-flex align-center" :class="mdAndUp ? 'flex-row' : 'flex-column justify-center'">
        <v-img
          :src="logo"
          :max-width="mdAndUp ? 100 : 70"
          :width="mdAndUp ? 100 : 70"
          :height="mdAndUp ? 40 : 32"
          class="mr-md-4 mb-1 mb-md-0"
          contain
        />

        <v-img v-if="mdAndUp" :src="ministerio" max-width="400" class="ml-5" contain />
      </div>
    </v-toolbar-title>

    <v-autocomplete
      v-if="mdAndUp"
      v-model="selectedResult"
      v-model:search="searchText"
      :items="searchResults"
      :loading="isSearching"
      item-title="display"
      item-value="uid"
      no-filter
      color="surface_variant"
      bg-color="surface_variant"
      clearable
      :placeholder="searchPlaceholder"
      persistent-placeholder
      variant="outlined"
      hide-details
      :hide-no-data="!showNoData"
      no-data-text="Sin Resultados"
      density="compact"
      rounded
      prepend-inner-icon="mdi-magnify"
      @update:model-value="onSelectResult"
    >
      <template #item="{ props, item }">
        <v-list-item
          v-bind="props"
          :title="item.raw.display"
          :class="{ 'search-item--unavailable': !isVisibleOnMap(item.raw) }"
        >
          <template #append>
            <div class="d-flex align-center ga-2">
              <v-tooltip v-if="!isVisibleOnMap(item.raw)" location="top" max-width="220">
                <template #activator="{ props: tooltipProps }">
                  <v-icon v-bind="tooltipProps" size="16" color="grey">mdi-map-marker-off</v-icon>
                </template>
                No visible en el mapa con el modelo actualmente seleccionado
              </v-tooltip>

              <v-chip
                v-if="item.raw.originType === 'punto_saih'"
                size="x-small"
                variant="flat"
                :style="getTipoCodChipStyle(item.raw.tipoCod)"
                class="font-weight-bold"
              >
                {{ getTipoCodLabel(item.raw.tipoCod) }}
              </v-chip>

              <v-btn
                icon="mdi-map-marker"
                size="x-small"
                variant="text"
                :disabled="!hasValidCoordinates(item.raw)"
                @click.stop="flyToResult(item.raw)"
              />
            </div>
          </template>

          <template #subtitle>
            <span class="text-caption text-medium-emphasis">
              <v-chip
                size="x-small"
                variant="flat"
                :style="getOriginChipStyle(item.raw.originType)"
                class="mr-2"
              >
                {{ item.raw.originLabel }}
              </v-chip>
            </span>
          </template>
        </v-list-item>
      </template>
    </v-autocomplete>

    <v-spacer />

    <v-img :src="flowcastLogo" max-width="60" height="60" contain class="mr-4" />

    <UserMenu />
  </v-app-bar>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { searchService } from '@/services/general'
  import type { SearchResult } from '@/types/Search'
  import { useMapStore } from '@/stores/mapStore'
  import { useLayersStore } from '@/stores/layersStore'
  import { useSimulationsStore } from '@/stores/simulationsStore'
  import { useMapModelStore } from '@/stores/mapModelStore'
  import { useStationAvailabilityStore } from '@/stores/stationAvailabilityStore'
  import UserMenu from '@/components/basics/UserMenu.vue'
  import MobileNavigationMenu from './mobile/MobileNavigationMenu.vue'
  import logo from '@/assets/img/logo_saih-6.png'
  import ministerio from '@/assets/img/logo_espana.png'
  import flowcastLogo from '@/assets/img/TAGUS_FLOWCAST_logo.png'

  const { mdAndUp } = useDisplay()
  const router = useRouter()
  const route = useRoute()
  const mapStore = useMapStore()
  const layersStore = useLayersStore()
  const simulationsStore = useSimulationsStore()
  const mapModelStore = useMapModelStore()
  const stationAvailabilityStore = useStationAvailabilityStore()

  onMounted(() => {
    stationAvailabilityStore.ensureLoaded()
  })

  const isSimulationsRoute = computed(() => route.name === 'simulaciones')

  const searchText = ref('')
  const isSearching = ref(false)
  const selectedResult = ref<string | null>(null)
  const rawResults = ref<SearchResult[]>([])

  type SearchAutocompleteItem = SearchResult & {
    uid: string
    display: string
    subtitle: string
    originType: 'punto_saih' | 'subcuenca' | 'sistema' | 'zona' | 'meteoalerta' | 'other'
    originLabel: string
  }

  function getOriginType(origen: string): SearchAutocompleteItem['originType'] {
    const source = (origen ?? '').toLowerCase()

    if (source.includes('punto_saih')) return 'punto_saih'
    if (source.includes('subcuenca')) return 'subcuenca'
    if (source.includes('sistema')) return 'sistema'
    if (source.includes('meteoalerta')) return 'meteoalerta'
    if (source.includes('zona')) return 'zona'
    return 'other'
  }

  function getOriginLabel(originType: SearchAutocompleteItem['originType']): string {
    switch (originType) {
      case 'punto_saih':
        return 'Estación SAIH'
      case 'subcuenca':
        return 'Subcuenca'
      case 'sistema':
        return 'Sistema'
      case 'zona':
        return 'Zona'
      case 'meteoalerta':
        return 'Zona Meteoalerta'
      default:
        return 'Resultado'
    }
  }

  function getOriginChipStyle(originType: SearchAutocompleteItem['originType']) {
    switch (originType) {
      case 'subcuenca':
        return {
          background: '#f59e0b',
          color: '#ffffff',
        }
      case 'sistema':
        return {
          background: '#16a34a',
          color: '#ffffff',
        }
      case 'zona':
        return {
          background: '#2563eb',
          color: '#ffffff',
        }
      case 'meteoalerta':
        return {
          background: '#aa3c3c',
          color: '#ffffff',
        }
      case 'punto_saih':
        return {
          background: '#ffffff',
          color: '#1f2937',
          border: '1px solid #d1d5db',
        }
      default:
        return {
          background: '#e5e7eb',
          color: '#111827',
        }
    }
  }

  function getTipoCodLabel(tipoCod: string | null): string {
    const key = String(tipoCod ?? '').toUpperCase()

    switch (key) {
      case 'AR':
        return 'Aforo en Rio'
      case 'E':
        return 'Embalse'
      case 'I':
        return 'Impulsos'
      case 'P':
        return 'Pluviometro'
      case 'MC':
        return 'Marco de Control'
      case 'NV':
        return 'Nivómetro'
      case 'PN':
        return 'Pluvinimómetro'
      case 'AC':
        return 'Aforo en Canal'
      default:
        return key || 'SAIH'
    }
  }

  function getTipoCodChipStyle(tipoCod: string | null) {
    const key = String(tipoCod ?? '').toUpperCase()

    switch (key) {
      case 'AR':
        return { background: '#4775a8', color: '#ffffff' }
      case 'E':
        return { background: '#101c44', color: '#ffffff' }
      case 'I':
        return { background: '#183824', color: '#ffffff' }
      case 'P':
        return { background: '#666a6b', color: '#ffffff' }
      case 'AC':
        return { background: '#4f5faf', color: '#ffffff' }
      case 'MC':
        return { background: '#09351a', color: '#ffffff' }
      case 'PN':
        return { background: '#7d807f', color: '#ffffff' }
      case 'NV':
        return { background: '#acadaf', color: '#111827' }
      default:
        return { background: '#e5e7eb', color: '#111827' }
    }
  }

  const allSearchResults = computed<SearchAutocompleteItem[]>(() =>
    rawResults.value.map((result, index) => {
      const originType = getOriginType(result.origen)

      return {
        ...result,
        uid: `${result.origen}|${result.codigo ?? 'NO_CODE'}|${result.nombre}|${index}`,
        display:
          originType === 'punto_saih'
            ? result.codigo
              ? `${result.codigo} - ${result.nombre}`
              : result.nombre
            : result.codigo
              ? `${result.codigo} - ${result.nombre}`
              : result.nombre,
        subtitle: getOriginLabel(originType),
        originType,
        originLabel: getOriginLabel(originType),
      }
    })
  )

  const searchResults = computed<SearchAutocompleteItem[]>(() => {
    if (!isSimulationsRoute.value) return allSearchResults.value

    const allowedTipoCods = simulationsStore.isSimulationActive
      ? new Set(['E', 'AR'])
      : new Set(['E'])

    return allSearchResults.value.filter(
      (r) => r.originType === 'punto_saih' && allowedTipoCods.has((r.tipoCod ?? '').toUpperCase())
    )
  })

  const searchPlaceholder = computed(() => {
    if (!isSimulationsRoute.value) return 'Buscar estación, Subcuenca, Sistema o Zona'
    return simulationsStore.isSimulationActive ? 'Buscar embalse o aforo en río' : 'Buscar embalse'
  })

  const hasTypedQuery = computed(() => searchText.value.trim().length >= 2)
  const showNoData = computed(() => hasTypedQuery.value && !isSearching.value)

  let searchDebounce: ReturnType<typeof setTimeout> | null = null

  watch(searchText, (value) => {
    if (searchDebounce) clearTimeout(searchDebounce)

    const query = value.trim()
    if (query.length < 2) {
      rawResults.value = []
      isSearching.value = false
      return
    }

    searchDebounce = setTimeout(async () => {
      isSearching.value = true

      try {
        rawResults.value = await searchService(query)
      } catch (error) {
        console.error('Error loading search results', error)
        rawResults.value = []
      } finally {
        isSearching.value = false
      }
    }, 250)
  })

  function hasValidCoordinates(result: SearchResult): boolean {
    return Number.isFinite(result.x) && Number.isFinite(result.y)
  }

  // The map hides a punto_saih station when the active Caudal NAM/MIKE
  // model has no data for it (see geoserver.ts's applyModelAvailabilityFilter)
  // — the search autocomplete still lets you find and fly to it, but it's
  // dimmed here so it's clear why it won't actually be visible on the map.
  function isVisibleOnMap(item: SearchAutocompleteItem): boolean {
    if (item.originType !== 'punto_saih') return true

    const model = mapModelStore.selectedModel
    if (model === 'precipitacion') return true

    const availability = stationAvailabilityStore.getAvailability(item.codigo ?? '')
    if (!availability) return true

    if (model === 'nam') return availability.hasCaudalNam
    if (model === 'mike11') return availability.hasCaudalMike
    return availability.hasCaudalNam || availability.hasCaudalMike
  }

  function getFlyToZoom(result: SearchResult): number {
    const originType = getOriginType(result.origen)

    switch (originType) {
      case 'punto_saih':
        return 13
      case 'subcuenca':
        return 12
      case 'sistema':
        return 10
      case 'zona':
        return 10
      default:
        return 11
    }
  }

  function getLayerIdForOriginType(
    originType: SearchAutocompleteItem['originType']
  ): 'subcuencas' | 'sistemas10' | 'zonasexpl' | 'meteoalerta' | null {
    switch (originType) {
      case 'subcuenca':
        return 'subcuencas'
      case 'sistema':
        return 'sistemas10'
      case 'zona':
        return 'zonasexpl'
      case 'meteoalerta':
        return 'meteoalerta'
      default:
        return null
    }
  }

  function activateLayerForResult(result: SearchResult) {
    const originType = getOriginType(result.origen)
    const layerId = getLayerIdForOriginType(originType)

    const groupedLayerIds: Array<'subcuencas' | 'sistemas10' | 'zonasexpl' | 'meteoalerta'> = [
      'subcuencas',
      'sistemas10',
      'zonasexpl',
      'meteoalerta',
    ]

    if (originType === 'punto_saih') {
      groupedLayerIds.forEach((id) => {
        layersStore.setLayerVisibility(id, false)
      })
      return
    }

    if (!layerId) return

    groupedLayerIds.forEach((id) => {
      layersStore.setLayerVisibility(id, id === layerId)
    })
  }

  function flyToResult(result: SearchResult) {
    if (!hasValidCoordinates(result)) return

    const originType = getOriginType(result.origen)
    const layerId = getLayerIdForOriginType(originType)

    activateLayerForResult(result)

    mapStore.requestFlyTo(result.y, result.x, { zoom: getFlyToZoom(result), animate: true })

    if (layerId && result.codigo) {
      mapStore.requestFeatureSelection(layerId, String(result.codigo), { focus: false })
    }
  }

  function getQueryKeyFromResult(result: SearchResult): string | null {
    const originType = getOriginType(result.origen)

    if (originType === 'subcuenca') return 'subcuenca'
    if (originType === 'sistema') return 'sistema'
    if (originType === 'zona') return 'zona'
    if (originType === 'meteoalerta') return 'meteoalerta'

    const source = `${result.origen} ${result.tipoCod ?? ''}`.toLowerCase()
    if (source.includes('reporting')) return 'reportingPoint'

    return 'station'
  }

  async function onSelectResult(uid: string | null) {
    if (!uid) return

    const selected = searchResults.value.find((result) => result.uid === uid)
    if (!selected) return

    selectedResult.value = selected.uid
    searchText.value = selected.display

    flyToResult(selected)

    const queryKey = getQueryKeyFromResult(selected)
    if (!queryKey) return

    await router.replace({
      query: {
        ...route.query,
        [queryKey]: selected.codigo ?? selected.nombre,
      },
    })
  }
</script>

<style lang="scss" scoped>
  .search-item--unavailable {
    opacity: 0.45;
  }
</style>
