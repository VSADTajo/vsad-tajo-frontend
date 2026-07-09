<template>
  <div v-if="loading || feature" class="saih-sticky-header pa-4" :style="headerStyle">
    <div class="d-flex align-center gap-4" style="min-width: 0">
      <!-- Left: station info -->
      <div class="flex-shrink-0">
        <template v-if="feature">
          <div class="text-h6 font-weight-bold" style="color: white">
            {{ feature.properties?.codigo }}
          </div>
          <div class="text-caption" style="color: rgba(255, 255, 255, 0.9)">
            {{ feature.properties?.nombre }}
          </div>
        </template>
        <template v-else>
          <div class="text-h6 font-weight-bold" style="color: white">Cargando estacion</div>
          <div class="text-caption" style="color: rgba(255, 255, 255, 0.9)">
            Recuperando datos...
          </div>
        </template>
      </div>

      <!-- Center: slot -->
      <div class="flex-grow-1 d-flex justify-center">
        <slot />
      </div>

      <!-- Right: chips + close -->
      <div v-if="feature" class="d-flex align-center gap-2 flex-shrink-0">
        <v-chip
          v-if="feature.properties?.zona"
          size="x-small"
          prepend-icon="mdi-map"
          class="chip-zona mr-2"
        >
          {{ feature.properties.zona }}
        </v-chip>
        <v-chip
          v-if="feature.properties?.municipio"
          size="x-small"
          prepend-icon="mdi-city"
          class="chip-municipio mr-2"
        >
          {{ feature.properties.municipio }}
        </v-chip>
        <v-chip
          v-if="feature.properties?.provincia"
          size="x-small"
          prepend-icon="mdi-flag"
          class="chip-provincia mr-2"
        >
          {{ feature.properties.provincia }}
        </v-chip>
        <v-chip
          v-if="feature.properties?.ccaa"
          size="x-small"
          prepend-icon="mdi-crown"
          class="chip-ccaa mr-2"
        >
          {{ feature.properties.ccaa }}
        </v-chip>

        <v-chip
          v-if="feature.properties?.stationType"
          :prepend-icon="feature.properties?.tipo === 'SAIH' ? 'mdi-water' : 'mdi-map-marker'"
          size="x-small"
          class="chip-type font-weight-bold ml-2"
        >
          {{ feature.properties.stationType }}
        </v-chip>

        <v-chip
          v-if="feature.properties?.area"
          size="x-small"
          prepend-icon="mdi-vector-square"
          class="chip-geo ml-2"
        >
          Area: {{ Number(feature.properties.area).toFixed(2) }} km²
        </v-chip>
        <v-chip
          v-if="feature.properties?.perimetro"
          size="x-small"
          prepend-icon="mdi-ruler"
          class="chip-geo ml-2"
        >
          Perimetro: {{ Number(feature.properties.perimetro).toFixed(2) }} km
        </v-chip>

        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          style="color: white"
          class="ml-3"
          @click="$emit('close')"
        />
      </div>

      <v-btn
        v-else
        icon="mdi-close"
        variant="text"
        size="small"
        style="color: white"
        @click="$emit('close')"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
  defineProps<{
    feature: GeoJSON.Feature | null | undefined
    loading: boolean
    headerStyle: Record<string, string>
  }>()

  defineEmits<{ close: [] }>()
</script>

<style scoped>
  .saih-sticky-header {
    position: sticky;
    top: 0;
    z-index: 30;
    border-radius: 4px 4px 0 0;
  }

  .chip-zona {
    background: rgba(99, 125, 234, 0.35) !important;
    color: #c5cff9 !important;
  }
  .chip-zona :deep(.v-chip__prepend .v-icon) {
    color: #c5cff9;
  }

  .chip-municipio {
    background: rgba(255, 152, 0, 0.35) !important;
    color: #ffd180 !important;
  }
  .chip-municipio :deep(.v-chip__prepend .v-icon) {
    color: #ffd180;
  }

  .chip-provincia {
    background: rgba(76, 175, 80, 0.35) !important;
    color: #b9f6ca !important;
  }
  .chip-provincia :deep(.v-chip__prepend .v-icon) {
    color: #b9f6ca;
  }

  .chip-ccaa {
    background: rgba(233, 30, 99, 0.35) !important;
    color: #f8bbd0 !important;
  }
  .chip-ccaa :deep(.v-chip__prepend .v-icon) {
    color: #f8bbd0;
  }

  .chip-type {
    background: rgba(255, 255, 255, 0.2) !important;
    color: white !important;
  }
  .chip-type :deep(.v-chip__prepend .v-icon) {
    color: rgba(255, 255, 255, 0.8);
  }

  .chip-geo {
    background: rgba(255, 255, 255, 0.2) !important;
    color: white !important;
  }
  .chip-geo :deep(.v-chip__prepend .v-icon) {
    color: rgba(255, 255, 255, 0.8);
  }
</style>
