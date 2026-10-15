<template>
  <div v-if="info && formattedDate" class="sim-date-badge bg-surface">
    <span class="sim-date-badge__label">{{ info.label }}:</span>
    <span class="sim-date-badge__date">{{ formattedDate }}</span>
    <span class="sim-date-badge__freq">
      datos actualizados cada {{ info.updateFrequencyHours }} horas
    </span>
  </div>
</template>

<script setup lang="ts">
  import { computed, watch } from 'vue'
  import { format } from 'date-fns'
  import { es } from 'date-fns/locale'
  import { useMapDataSourceStore } from '@/stores/mapDataSourceStore'
  import { useMapModelStore } from '@/stores/mapModelStore'
  import { useMapPrecipHorizonStore } from '@/stores/mapPrecipHorizonStore'
  import { parseDate } from '@/utils/dates'
  import {
    getCurrentSimulationInfo,
    saihAlertsVersion,
    ensureSaihAlertsLoaded,
  } from '@/utils/saihAlerts'

  const dataSourceStore = useMapDataSourceStore()
  const modelStore = useMapModelStore()
  const precipHorizonStore = useMapPrecipHorizonStore()

  const info = computed(() => {
    // Read as a reactive dependency — saihAlertsVersion bumps whenever the
    // underlying (non-reactive) byStation maps get repopulated, which is
    // the only signal this computed has that there's new data to re-read.
    void saihAlertsVersion.value
    return getCurrentSimulationInfo()
  })

  // simulationDate comes as a compact "yyyyMMddHHmm" string (12 digits, no
  // seconds) — the same shape formatSimulationDate() in utils/dates.ts
  // parses, which parseDate() doesn't handle (it only recognizes the
  // 14-digit-with-seconds form).
  function parseCompactSimulationDate(value: string): Date | null {
    if (!/^\d{12}$/.test(value)) return null

    const year = value.slice(0, 4)
    const month = value.slice(4, 6)
    const day = value.slice(6, 8)
    const hours = value.slice(8, 10)
    const minutes = value.slice(10, 12)

    const parsed = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const formattedDate = computed(() => {
    const raw = info.value?.simulationDate
    if (!raw) return null

    const parsed = parseCompactSimulationDate(raw) ?? parseDate(raw)
    if (!parsed) return raw

    return format(parsed, 'dd/MM/yyyy HH:mm', { locale: es })
  })

  // The badge's data isn't guaranteed to already be loaded — that only
  // happens today when the SAIH stations layer itself syncs on the map, not
  // on every data-source/model change — so make sure it's fetched here too.
  watch(
    () => [
      dataSourceStore.selectedDataSource,
      modelStore.selectedModel,
      precipHorizonStore.selectedHours,
    ],
    () => {
      void ensureSaihAlertsLoaded()
    },
    { immediate: true }
  )
</script>

<style scoped>
  .sim-date-badge {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    font-size: 0.8125rem;
    line-height: 1.2;
  }

  .sim-date-badge__label {
    font-weight: 600;
  }

  .sim-date-badge__date {
    font-weight: 500;
  }

  .sim-date-badge__freq {
    color: rgba(var(--v-theme-on-surface), 0.6);
    font-size: 0.75rem;
  }
</style>
