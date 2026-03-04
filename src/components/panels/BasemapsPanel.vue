<template>
  <div class="d-flex flex-column">
    <v-row class="flex-grow-1">
      <v-col cols="12">
        <h2 class="pl-4 pt-4">Mapas Base</h2>
      </v-col>
    </v-row>
    <v-row class="flex-grow-1">
      <v-col cols="12">
        <v-list v-model:selected="selectedBasemap" class="flex-grow-1 px-2" bg-color="primary">
          <v-list-item
            v-for="layer in basemapsLayers"
            :key="layer.id"
            :value="layer.id"
            class="rounded pa-3 elevation-1"
            @click="setBasemap(layer.id)"
          >
            <div class="d-flex align-center justify-space-between w-100">
              <!-- Nombre -->
              <div class="text-subtitle-1 font-weight-medium">
                {{ layer.name }}
              </div>

              <!-- Preview -->
              <v-avatar size="64" rounded="lg" class="elevation-2">
                <img :src="layer.preview" alt="preview" />
              </v-avatar>
            </div>
          </v-list-item>
        </v-list>
      </v-col>
    </v-row>
  </div>
</template>

<script lang="ts" setup>
  import { basemapsLayers } from '@/constants/basemaps'

  import { useBasemap } from '@/composables/useBasemaps'

  const { selectedBasemap, setBasemap } = useBasemap()
</script>
