<template>
  <v-tooltip :text="isActive ? 'Desactivar simulación' : 'Activar simulación'" location="left">
    <template #activator="{ props: tooltipProps }">
      <div
        v-bind="tooltipProps"
        class="simulation-btn-wrapper"
        :class="{ 'simulation-btn-wrapper--active': isActive }"
      >
        <v-btn
          icon
          size="large"
          :color="isActive ? 'primary' : undefined"
          :variant="isActive ? 'flat' : 'tonal'"
          elevation="4"
        >
          <v-icon size="26">mdi-waves</v-icon>
        </v-btn>
      </div>
    </template>
  </v-tooltip>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useSimulationsStore } from '@/stores/simulationsStore'

  const simulationsStore = useSimulationsStore()
  const isActive = computed(() => simulationsStore.isSimulationActive)
</script>

<style scoped>
  .simulation-btn-wrapper {
    border-radius: 50%;
  }

  .simulation-btn-wrapper--active {
    animation: simulation-glow 2s ease-in-out infinite;
  }

  @keyframes simulation-glow {
    0%,
    100% {
      box-shadow:
        0 0 0 3px rgba(var(--v-theme-primary), 0.2),
        0 0 14px 3px rgba(var(--v-theme-primary), 0.3);
    }
    50% {
      box-shadow:
        0 0 0 7px rgba(var(--v-theme-primary), 0.15),
        0 0 28px 8px rgba(var(--v-theme-primary), 0.45);
    }
  }
</style>
