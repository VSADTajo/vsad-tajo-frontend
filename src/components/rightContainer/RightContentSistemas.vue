<template>
  <v-card class="pa-4 bg-background" elevation="2">
    <v-progress-linear v-if="loading" indeterminate />

    <template v-if="route.query.sistema">
      <v-card-title class="d-flex justify-space-between align-start">
        <div>
          <div class="text-h6 font-weight-bold">
            {{ route.query.sistema }}
          </div>
        </div>

        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDrawer" />
      </v-card-title>

      <v-divider class="my-3" />

      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6">
            <MapDetail type="sistemas10" />
          </v-col>
        </v-row>
      </v-card-text>
    </template>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import MapDetail from './MapDetail.vue'
  import type { WFSLayerConfig } from '@/types/Layers'
  import { dynamicLayersConfig } from '@/config/layers.config'
  import { getWFSFeatureById } from '@/services/geoserver'

  const route = useRoute()
  const router = useRouter()

  const loading = ref(false)
  const error = ref<string | null>(null)
  const feature = ref<GeoJSON.Feature | null>(null)

  const sistemaName = computed(() => route.query.sistema as string | undefined)

  const sistemaConfig = computed<WFSLayerConfig | undefined>(
    () => dynamicLayersConfig.find((l) => l.id === 'sistemas10') as WFSLayerConfig | undefined
  )

  async function loadFeature(code: string) {
    if (!sistemaConfig.value) {
      console.warn('Sistemas layer config not found')
      return
    }

    loading.value = true
    error.value = null

    try {
      const result = await getWFSFeatureById(sistemaConfig.value, 'sistema', code)

      if (!result) {
        error.value = 'Feature not found'
        feature.value = null
        return
      }
      feature.value = result
    } catch (err) {
      console.error('Error loading feature', err)
      error.value = 'Error loading feature'
      feature.value = null
    } finally {
      loading.value = false
    }

    console.log('feature.valuePPPPPfeature.value', feature.value)
  }

  watch(
    sistemaName,
    async (sistema) => {
      if (!sistema) {
        feature.value = null
        return
      }

      await loadFeature(sistema)
    },
    { immediate: true }
  )

  function closeDrawer() {
    if (!route.query.sistema) return

    const query = { ...route.query }
    delete query.sistema

    router.replace({ query })
  }
</script>
