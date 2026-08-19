import type { Feature } from 'geojson'
import { getMaxAndLatestValuesService } from '@/services/predictions'
import type { StationMaxLatestValue } from '@/types/Predictions'
import { useMapDataSourceStore } from '@/stores/mapDataSourceStore'
import { useMapModelStore } from '@/stores/mapModelStore'

const ALERT_YELLOW = '#fde68a'
const ALERT_ORANGE = '#fdba74'
const ALERT_RED = '#fca5a5'
const ALERT_CACHE_TTL_MS = 5 * 60 * 1000
const ALERT_FAILURE_COOLDOWN_MS = 60 * 1000

// NAM Harmonie
const bestQNamHByStation = new Map<string, StationMaxLatestValue>()
const bestINamHByStation = new Map<string, StationMaxLatestValue>()
const bestPHByStation = new Map<string, StationMaxLatestValue>()

// NAM EPS
const bestQNamEByStation = new Map<string, StationMaxLatestValue>()
const bestINamEByStation = new Map<string, StationMaxLatestValue>()
const bestPEByStation = new Map<string, StationMaxLatestValue>()

// MIKE11 Harmonie
const bestQMk11HByStation = new Map<string, StationMaxLatestValue>()
const bestIMk11HByStation = new Map<string, StationMaxLatestValue>()

// MIKE11 EPS
const bestQMk11EByStation = new Map<string, StationMaxLatestValue>()
const bestIMk11EByStation = new Map<string, StationMaxLatestValue>()

// Observado
const bestQObsAforosByStation = new Map<string, StationMaxLatestValue>()
const bestQObsEmbalseByStation = new Map<string, StationMaxLatestValue>()
const bestPObsByStation = new Map<string, StationMaxLatestValue>()

type CacheSlot = { loadedAt: number; failedAt: number; inFlight: Promise<void> | null }

const slots: Record<string, CacheSlot> = {
  namH: { loadedAt: 0, failedAt: 0, inFlight: null },
  namE: { loadedAt: 0, failedAt: 0, inFlight: null },
  mk11H: { loadedAt: 0, failedAt: 0, inFlight: null },
  mk11E: { loadedAt: 0, failedAt: 0, inFlight: null },
  obs: { loadedAt: 0, failedAt: 0, inFlight: null },
}

function normalizeStationKey(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function readNumber(props: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = props[key]
    if (raw == null) continue

    if (typeof raw === 'number' && Number.isFinite(raw)) return raw

    if (typeof raw === 'string') {
      const parsed = Number.parseFloat(raw.replace(',', '.').trim())
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return null
}

function getThresholds(props: Record<string, unknown>) {
  return {
    yellow: readNumber(props, ['umbral_caudal_1', 'umbral_cauda_1', 'umbral_amarillo']),
    orange: readNumber(props, ['umbral_caudal_2', 'umbral_cauda_2', 'umbral_naranja']),
    red: readNumber(props, ['umbral_caudal_3', 'umbral_cauda_3', 'umbral_rojo']),
  }
}

function getStationCode(feature: Feature): string {
  const props = (feature.properties ?? {}) as Record<string, unknown>
  return normalizeStationKey(
    props.stationCode ?? props.codigo ?? props.stationId ?? props.code ?? feature.id
  )
}

function isEmbalseStation(feature: Feature): boolean {
  const props = (feature.properties ?? {}) as Record<string, unknown>
  const tipo = normalizeStationKey(props.tipoCod ?? props.tipo_cod)
  return tipo === 'E'
}

function pickBestEntry(current: StationMaxLatestValue | undefined, next: StationMaxLatestValue) {
  if (!current) return next
  if (next.maxValue > current.maxValue) return next
  if (next.maxValue < current.maxValue) return current
  return next.maxDate > current.maxDate ? next : current
}

function setBestByStation(
  targetMap: Map<string, StationMaxLatestValue>,
  values: StationMaxLatestValue[]
) {
  targetMap.clear()

  for (const item of values) {
    const stationKey = normalizeStationKey(item.stationId)
    if (!stationKey || !Number.isFinite(item.maxValue)) continue

    const previous = targetMap.get(stationKey)
    targetMap.set(stationKey, pickBestEntry(previous, item))
  }
}

async function runSlot(
  slotKey: string,
  sizeCheck: Map<string, StationMaxLatestValue>,
  loader: () => Promise<void>
): Promise<void> {
  const slot = slots[slotKey]
  const cacheIsFresh = Date.now() - slot.loadedAt < ALERT_CACHE_TTL_MS
  const inCooldown = Date.now() - slot.failedAt < ALERT_FAILURE_COOLDOWN_MS

  if (cacheIsFresh && sizeCheck.size > 0) return
  if (inCooldown) return
  if (slot.inFlight) {
    await slot.inFlight
    return
  }

  slot.inFlight = loader()
    .then(() => {
      slot.loadedAt = Date.now()
      slot.failedAt = 0
    })
    .catch((err) => {
      slot.failedAt = Date.now()
      console.warn(`SAIH [${slotKey}] values unavailable. Retrying in 60s.`, err)
    })
    .finally(() => {
      slot.inFlight = null
    })

  await slot.inFlight
}

export function invalidateSaihAlertsCache(): void {
  for (const slot of Object.values(slots)) {
    slot.loadedAt = 0
  }
}

export async function ensureSaihAlertsLoaded(): Promise<void> {
  const source = useMapDataSourceStore().selectedDataSource
  const model = useMapModelStore().selectedModel

  if (source === 'observado') {
    await runSlot('obs', bestQObsAforosByStation, async () => {
      const [qAforos, qEmbalse, precip] = await Promise.all([
        getMaxAndLatestValuesService('FICT98.historical'),
        getMaxAndLatestValuesService('FICT99.historical'),
        getMaxAndLatestValuesService('WI__01.historical'),
      ])
      setBestByStation(bestQObsAforosByStation, qAforos)
      setBestByStation(bestQObsEmbalseByStation, qEmbalse)
      setBestByStation(bestPObsByStation, precip)
    })
    return
  }

  if (source === 'harmonie') {
    if (model === 'nam') {
      await runSlot('namH', bestQNamHByStation, async () => {
        const [q, i, p] = await Promise.all([
          getMaxAndLatestValuesService('Q.NAM.harmonie'),
          getMaxAndLatestValuesService('I.NAM.harmonie'),
          getMaxAndLatestValuesService('P.harmonie.forecast'),
        ])
        setBestByStation(bestQNamHByStation, q)
        setBestByStation(bestINamHByStation, i)
        setBestByStation(bestPHByStation, p)
      })
    } else {
      await runSlot('mk11H', bestQMk11HByStation, async () => {
        const [q, i, p] = await Promise.all([
          getMaxAndLatestValuesService('Q.mk11.forecast'),
          getMaxAndLatestValuesService('I.mk11.forecast'),
          getMaxAndLatestValuesService('P.harmonie.forecast'),
        ])
        setBestByStation(bestQMk11HByStation, q)
        setBestByStation(bestIMk11HByStation, i)
        setBestByStation(bestPHByStation, p)
      })
    }
    return
  }

  if (source === 'epsmedio') {
    if (model === 'nam') {
      await runSlot('namE', bestQNamEByStation, async () => {
        const [q, i, p] = await Promise.all([
          getMaxAndLatestValuesService('Q.NAM.ens'),
          getMaxAndLatestValuesService('I.nam.ens'),
          getMaxAndLatestValuesService('P.ens.forecast'),
        ])
        setBestByStation(bestQNamEByStation, q)
        setBestByStation(bestINamEByStation, i)
        setBestByStation(bestPEByStation, p)
      })
    } else {
      await runSlot('mk11E', bestQMk11EByStation, async () => {
        const [q, i, p] = await Promise.all([
          getMaxAndLatestValuesService('Q.mk11.EPSforecast'),
          getMaxAndLatestValuesService('I.mk11.EPSforecast'),
          getMaxAndLatestValuesService('P.ens.forecast'),
        ])
        setBestByStation(bestQMk11EByStation, q)
        setBestByStation(bestIMk11EByStation, i)
        setBestByStation(bestPEByStation, p)
      })
    }
  }
}

export function getSaihAlertInfo(feature: Feature): {
  maxValue: number | null
  latestValue: number | null
  latestDate: string | null
  maxDate: string | null
  simulationDate: string | null
  backgroundColor: string | null
} {
  const stationCode = getStationCode(feature)
  if (!stationCode) {
    return {
      maxValue: null,
      latestValue: null,
      latestDate: null,
      maxDate: null,
      simulationDate: null,
      backgroundColor: null,
    }
  }

  const source = useMapDataSourceStore().selectedDataSource
  const model = useMapModelStore().selectedModel
  const isEmbalse = isEmbalseStation(feature)

  let bestEntry: StationMaxLatestValue | undefined

  if (source === 'observado') {
    bestEntry = isEmbalse
      ? bestQObsEmbalseByStation.get(stationCode)
      : bestQObsAforosByStation.get(stationCode)
  } else if (source === 'harmonie') {
    if (model === 'nam') {
      bestEntry = isEmbalse
        ? bestINamHByStation.get(stationCode)
        : bestQNamHByStation.get(stationCode)
    } else {
      bestEntry = isEmbalse
        ? bestIMk11HByStation.get(stationCode)
        : bestQMk11HByStation.get(stationCode)
    }
  } else if (source === 'epsmedio') {
    if (model === 'nam') {
      bestEntry = isEmbalse
        ? bestINamEByStation.get(stationCode)
        : bestQNamEByStation.get(stationCode)
    } else {
      bestEntry = isEmbalse
        ? bestIMk11EByStation.get(stationCode)
        : bestQMk11EByStation.get(stationCode)
    }
  }

  if (!bestEntry) {
    return {
      maxValue: null,
      latestValue: null,
      latestDate: null,
      maxDate: null,
      simulationDate: null,
      backgroundColor: null,
    }
  }

  const props = (feature.properties ?? {}) as Record<string, unknown>
  const thresholds = getThresholds(props)

  let backgroundColor: string | null = null
  if (thresholds.red != null && bestEntry.maxValue >= thresholds.red) backgroundColor = ALERT_RED
  else if (thresholds.orange != null && bestEntry.maxValue >= thresholds.orange)
    backgroundColor = ALERT_ORANGE
  else if (thresholds.yellow != null && bestEntry.maxValue >= thresholds.yellow)
    backgroundColor = ALERT_YELLOW

  return {
    maxValue: bestEntry.maxValue,
    latestValue: bestEntry.latestValue,
    latestDate: bestEntry.latestDate,
    maxDate: bestEntry.maxDate,
    simulationDate: bestEntry.simulationDate,
    backgroundColor,
  }
}

export function getSaihPrecipMaxInfo(feature: Feature): {
  maxValue: number | null
  maxDate: string | null
  simulationDate: string | null
} {
  const stationCode = getStationCode(feature)
  if (!stationCode) return { maxValue: null, maxDate: null, simulationDate: null }

  const source = useMapDataSourceStore().selectedDataSource

  let bestEntry: StationMaxLatestValue | undefined
  if (source === 'harmonie') {
    bestEntry = bestPHByStation.get(stationCode)
  } else if (source === 'epsmedio') {
    bestEntry = bestPEByStation.get(stationCode)
  } else if (source === 'observado') {
    bestEntry = bestPObsByStation.get(stationCode)
  }

  if (!bestEntry) return { maxValue: null, maxDate: null, simulationDate: null }

  return {
    maxValue: bestEntry.maxValue,
    maxDate: bestEntry.maxDate,
    simulationDate: bestEntry.simulationDate,
  }
}
