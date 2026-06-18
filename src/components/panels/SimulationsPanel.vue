<template>
  <div class="simulations-container">
    <div class="simulations-title">
      <v-row>
        <v-col cols="12" class="d-flex align-center justify-space-between">
          <h2 class="pl-4 pt-4">Simulaciones</h2>
          <div class="d-flex align-center mr-4 mt-4 gap-2">
            <v-tooltip text="Lista de simulaciones" location="bottom">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  color="primary"
                  density="comfortable"
                  class="mr-2"
                  :variant="simulationsStore.historyOpen ? 'flat' : 'tonal'"
                  @click="simulationsStore.toggleHistory()"
                >
                  <v-icon>mdi-history</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            <v-btn icon color="primary" density="comfortable" @click="goBack">
              <v-icon>{{ mdAndUp ? 'mdi-arrow-left' : 'mdi-arrow-down' }}</v-icon>
            </v-btn>
          </div>
        </v-col>
        <v-divider />
      </v-row>
    </div>

    <div class="simulations-body mt-4">
      <v-row class="mt-1">
        <v-col cols="12" class="pt-2 pb-2">
          <v-autocomplete
            v-model="selectedCode"
            v-model:search="searchText"
            :items="autocompleteItems"
            item-title="title"
            item-value="value"
            clearable
            label="Buscar Embalse"
            variant="outlined"
            color="primary"
            bg-color="surface"
            hide-details
            class="px-3"
            density="compact"
            rounded
            prepend-inner-icon="mdi-magnify"
            no-filter
          />
        </v-col>
        <v-col cols="12">
          <p class="pl-4 font-weight-medium">Embalses</p>
        </v-col>
        <v-col cols="12" class="pt-0 pb-0">
          <SimulationsEmbalseList
            :embalses="embalses"
            :filter="searchText"
            :loading="loading"
            :selected-code="selectedCode ?? undefined"
            class="simulations-list"
            @select="selectedCode = $event ?? null"
            @open="openDetail"
            @fly-to="flyToEmbalse"
          />
        </v-col>
        <template v-if="selectedEmbalse">
          <v-col cols="12">
            <p class="pl-4 font-weight-medium">Nueva Operación</p>
          </v-col>
          <v-col cols="12" class="pt-0">
            <SimulationsSimulateForm
              :embalse="selectedEmbalse"
              :initial-value="editingOperation"
              @simulate="onSimulate"
            />
          </v-col>
          <v-col cols="12" class="pt-2 pb-4">
            <SimulationsOperationsList
              :operations="operations"
              @edit="onEditOperation"
              @delete="onDeleteOperation"
              @create-simulation="onCreateSimulation"
            />
          </v-col>
        </template>
      </v-row>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay } from 'vuetify'
  import { getEmbalseStationsService, type StationByCodeResponse } from '@/services/general'
  import { useLayersStore } from '@/stores/layersStore'
  import { useMapStore } from '@/stores/mapStore'
  import { useSimulationsStore } from '@/stores/simulationsStore'
  import type { SimulationOperation } from '@/types/Simulations'
  import SimulationsEmbalseList from './SimulationsEmbalseList.vue'
  import SimulationsSimulateForm from './SimulationsSimulateForm.vue'
  import SimulationsOperationsList from './SimulationsOperationsList.vue'

  const { mdAndUp } = useDisplay()
  const route = useRoute()
  const router = useRouter()
  const layersStore = useLayersStore()
  const mapStore = useMapStore()
  const simulationsStore = useSimulationsStore()

  const loading = ref(true)
  const embalses = ref<StationByCodeResponse[]>([])
  const selectedCode = ref<string | null>(null)
  const searchText = ref('')
  const operations = ref<SimulationOperation[]>([])
  const editingIndex = ref<number | null>(null)

  const autocompleteItems = computed(() =>
    embalses.value.map((e) => ({ title: e.name, value: e.stationCode }))
  )

  const selectedEmbalse = computed(
    () => embalses.value.find((e) => e.stationCode === selectedCode.value) ?? null
  )

  const editingOperation = computed(() =>
    editingIndex.value != null ? (operations.value[editingIndex.value] ?? null) : null
  )

  function onSimulate(op: SimulationOperation) {
    if (editingIndex.value != null) {
      operations.value[editingIndex.value] = op
      editingIndex.value = null
    } else {
      operations.value.push(op)
    }
  }

  function onEditOperation(i: number) {
    editingIndex.value = i
  }

  function onDeleteOperation(i: number) {
    operations.value.splice(i, 1)
    if (editingIndex.value === i) {
      editingIndex.value = null
    } else if (editingIndex.value != null && editingIndex.value > i) {
      editingIndex.value--
    }
  }

  async function onCreateSimulation() {
    // TODO: replace with real API call when endpoint is ready
    console.log('[SimulationsPanel] create simulation', operations.value)
    operations.value = []
    editingIndex.value = null
  }

  watch(
    () => simulationsStore.mapClickedStationCode,
    (code) => {
      if (code === null) return
      selectedCode.value = selectedCode.value === code ? null : code
      simulationsStore.consumeMapStationClick()
    }
  )

  watch(
    () => simulationsStore.isSimulationActive,
    (active) => {
      if (active) {
        layersStore.applySimulationsWithAforoPreset()
      } else {
        layersStore.applySimulationsPreset()
      }
    }
  )

  onMounted(async () => {
    simulationsStore.setPanelActive(true)
    layersStore.applySimulationsPreset()
    try {
      embalses.value = await getEmbalseStationsService()
    } finally {
      loading.value = false
    }
  })

  onUnmounted(() => {
    simulationsStore.setPanelActive(false)
    layersStore.resetStationLayers()
  })

  function openDetail(code: string) {
    router.replace({ query: { ...route.query, station: code } })
  }

  function flyToEmbalse(code: string) {
    const embalse = embalses.value.find((e) => e.stationCode === code)
    if (embalse?.latitude != null && embalse?.longitude != null) {
      mapStore.requestFlyTo(embalse.latitude, embalse.longitude, { zoom: 13 })
    }
  }

  function goBack() {
    router.push('/')
  }
</script>

<style scoped>
  .simulations-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .simulations-body {
    flex-grow: 0;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .simulations-list {
    flex: 1 1 0;
    min-height: 0;
    padding-bottom: 24px;
  }
</style>
