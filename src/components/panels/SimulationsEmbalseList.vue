<template>
  <div class="embalse-list-wrapper">
    <template v-if="loading">
      <v-skeleton-loader v-for="n in 8" :key="n" type="list-item-two-line" class="mx-2 my-1" />
    </template>

    <template v-else-if="filteredEmbalses.length">
      <v-list density="compact" bg-color="surface_variant" class="py-0">
        <v-list-item
          v-for="embalse in filteredEmbalses"
          :key="embalse.stationCode"
          :active="selectedCode === embalse.stationCode"
          active-color="primary"
          class="border"
          @click="toggle(embalse.stationCode)"
        >
          <template #prepend>
            <div class="saih-marker mr-3" style="--saih-color: #101c44; flex-shrink: 0">E</div>
          </template>

          <v-list-item-title class="text-body-2 font-weight-medium">
            {{ embalse.name }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ embalse.stationCode }}
          </v-list-item-subtitle>

          <template #append>
            <div class="embalse-actions" @click.stop>
              <v-btn
                icon
                variant="text"
                title="Ir al embalse"
                density="compact"
                color="primary"
                class="mr-2"
              >
                <v-icon size="16">mdi-map-marker</v-icon>
              </v-btn>
              <v-btn icon variant="text" density="compact" title="Abrir detalle">
                <v-icon size="16">mdi-open-in-new</v-icon>
              </v-btn>
            </div>
          </template>
        </v-list-item>
      </v-list>
    </template>

    <div v-else class="embalse-list-empty text-medium-emphasis text-caption">
      {{ filter ? 'Sin resultados para la búsqueda' : 'No hay embalses disponibles' }}
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import type { StationByCodeResponse } from '@/services/general'

  const props = defineProps<{
    embalses: StationByCodeResponse[]
    filter?: string
    loading?: boolean
    selectedCode?: string | null
  }>()

  const emit = defineEmits<{
    select: [code: string | null]
  }>()

  const filteredEmbalses = computed(() => {
    const q = props.filter?.trim().toLowerCase() ?? ''
    if (!q) return props.embalses
    return props.embalses.filter(
      (e) => e.name.toLowerCase().includes(q) || e.stationCode.toLowerCase().includes(q)
    )
  })

  function toggle(code: string) {
    emit('select', props.selectedCode === code ? null : code)
  }
</script>

<style scoped>
  .embalse-list-wrapper {
    max-height: 50vh;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(110, 118, 129, 0.5) transparent;
  }

  .embalse-list-wrapper::-webkit-scrollbar {
    width: 5px;
  }

  .embalse-list-wrapper::-webkit-scrollbar-thumb {
    background: rgba(110, 118, 129, 0.5);
    border-radius: 999px;
  }

  .embalse-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .embalse-list-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    text-align: center;
  }
</style>
