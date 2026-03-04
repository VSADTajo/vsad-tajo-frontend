<template>
  <v-card class="pa-4" elevation="2">
    <!-- Header -->
    <v-card-title class="d-flex justify-space-between align-start">
      <div>
        <div class="text-h6 font-weight-bold">
          {{ featureStore.selected?.properties?.NOMBRE }}
        </div>
        <div class="text-caption">Código: {{ featureStore.selected?.properties?.CODIGO }}</div>
      </div>

      <v-btn icon="mdi-close" variant="text" size="small" @click="closeDrawer" />
    </v-card-title>

    <v-divider class="my-3" />

    <v-card-text>
      <!-- Tipo -->
      <div class="mb-3">
        <v-chip color="primary" variant="tonal" size="small">
          {{ featureStore.selected?.properties?.TIPO }}
        </v-chip>
      </div>

      <!-- Información -->
      <v-row dense>
        <v-col cols="12" sm="3">
          <div class="text-caption">Zona</div>
          <div class="text-body-2 font-weight-medium">
            {{ featureStore.selected?.properties?.ZONA }}
          </div>
        </v-col>

        <v-col cols="12" sm="3">
          <div class="text-caption">Municipio</div>
          <div class="text-body-2 font-weight-medium">
            {{ featureStore.selected?.properties?.MUNICIPIO }}
          </div>
        </v-col>

        <v-col cols="12" sm="3">
          <div class="text-caption">Provincia</div>
          <div class="text-body-2 font-weight-medium">
            {{ featureStore.selected?.properties?.PROVINCIA }}
          </div>
        </v-col>

        <v-col cols="12" sm="3">
          <div class="text-caption">CCAA</div>
          <div class="text-body-2 font-weight-medium">
            {{ featureStore.selected?.properties?.CCAA }}
          </div>
        </v-col>
      </v-row>

      <!-- <v-divider class="my-2" />

        <div>
          <div class="text-caption mb-1">Coordenadas (ETRS89 H30)</div>

          <v-row dense>
            <v-col cols="3">
              <div class="text-caption">X</div>
              <div class="text-body-2 font-weight-medium">
                {{ featureStore.selected?.properties?.XETRS89H30 }}
              </div>
            </v-col>

            <v-col cols="3">
              <div class="text-caption">Y</div>
              <div class="text-body-2 font-weight-medium">
                {{ featureStore.selected?.properties?.YETRS89H30 }}
              </div>
            </v-col>
          </v-row>
        </div>
        -->
    </v-card-text>
  </v-card>
  <v-card>
    <v-card-text>
      <v-sheet elevation="2">
        <v-tabs v-model="tab" color="primary">
          <v-tab value="caudal">Caudal</v-tab>
          <v-tab value="precipitaciones">Precipitaciones</v-tab>
          <v-tab value="volumenes">Volúmenes</v-tab>
        </v-tabs>

        <v-divider></v-divider>

        <v-tabs-window v-model="tab">
          <v-tabs-window-item value="caudal">
            <v-sheet class="pa-5">One</v-sheet>
          </v-tabs-window-item>
          <v-tabs-window-item value="precipitaciones">
            <v-sheet class="pa-5">Two</v-sheet>
          </v-tabs-window-item>
          <v-tabs-window-item value="volumenes">
            <v-sheet class="pa-5">Three</v-sheet>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-sheet>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
  import { useFeatureSelection } from '@/stores/features'
  import { onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ref } from 'vue'

  const tab = ref('caudal')

  const route = useRoute()
  const router = useRouter()

  const featureStore = useFeatureSelection()

  const closeDrawer = () => {
    router.replace({
      query: {
        ...route.query,
        station: undefined,
      },
    })

    featureStore.clear()
  }

  onMounted(() => {
    console.log('featureStore', featureStore)
  })
</script>
