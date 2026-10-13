import { ref } from 'vue'
import type { Feature } from 'geojson'
import { getMaxAndLatestValuesService, getPrecipAccumulatedService } from '@/services/predictions'
import type {
  PrecipAccumulatedHours,
  PrecipAccumulatedItem,
  PrecipAccumulatedSource,
  StationMaxLatestValue,
} from '@/types/Predictions'
import { useMapDataSourceStore, type MapDataSource } from '@/stores/mapDataSourceStore'
import { useMapModelStore } from '@/stores/mapModelStore'
import { useMapPrecipHorizonStore } from '@/stores/mapPrecipHorizonStore'

// Bumped every time a slot's byStation map is (re)populated — the maps
// themselves are plain (non-reactive) Maps, so a Vue computed reading them
// (e.g. getCurrentSimulationInfo) needs this as an explicit dependency to
// know when to re-run.
export const saihAlertsVersion = ref(0)

const ALERT_YELLOW = '#fde68a'
const ALERT_ORANGE = '#fdba74'
const ALERT_RED = '#fca5a5'
const ALERT_CACHE_TTL_MS = 5 * 60 * 1000
const ALERT_FAILURE_COOLDOWN_MS = 60 * 1000

// NAM Harmonie
const bestQNamHByStation = new Map<string, StationMaxLatestValue>()
const bestINamHByStation = new Map<string, StationMaxLatestValue>()

// NAM EPS
const bestQNamEByStation = new Map<string, StationMaxLatestValue>()
const bestINamEByStation = new Map<string, StationMaxLatestValue>()

// MIKE11 Harmonie
const bestQMk11HByStation = new Map<string, StationMaxLatestValue>()
const bestIMk11HByStation = new Map<string, StationMaxLatestValue>()

// MIKE11 EPS
const bestQMk11EByStation = new Map<string, StationMaxLatestValue>()
const bestIMk11EByStation = new Map<string, StationMaxLatestValue>()

// Observado
const bestQObsAforosByStation = new Map<string, StationMaxLatestValue>()
const bestQObsEmbalseByStation = new Map<string, StationMaxLatestValue>()

type CacheSlot = { loadedAt: number; failedAt: number; inFlight: Promise<void> | null }

function makeSlot(): CacheSlot {
  return { loadedAt: 0, failedAt: 0, inFlight: null }
}

// Caudal's models/sources load independently — the map only ever shows one
// at a time (MapView's model toggle), so on load only the active one's
// series get fetched instead of bundling all of them into every request.
// Precipitación has its own cache shape (precipAccumulatedState below) —
// it's one window-keyed slot, not per-model, since there's no NAM/MIKE11
// split for precipitación.
const slots = {
  caudal: {
    namH: makeSlot(),
    namE: makeSlot(),
    mk11H: makeSlot(),
    mk11E: makeSlot(),
    obs: makeSlot(),
  },
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

  saihAlertsVersion.value++
}

async function runSlot(
  label: string,
  slot: CacheSlot,
  sizeCheck: Map<string, StationMaxLatestValue>,
  loader: () => Promise<void>
): Promise<void> {
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
      console.warn(`SAIH [${label}] values unavailable. Retrying in 60s.`, err)
    })
    .finally(() => {
      slot.inFlight = null
    })

  await slot.inFlight
}

export function invalidateSaihAlertsCache(): void {
  for (const group of Object.values(slots)) {
    for (const slot of Object.values(group)) {
      slot.loadedAt = 0
    }
  }
  precipAccumulatedState.loadedAt = 0
}

// precip-accumulated's one cache slot: keyed by `${source}:${hours}` so a
// change in either the data-source toggle or the horizon toggle forces a
// refetch instead of silently reusing the previous combination's numbers.
type PrecipAccumulatedState = {
  key: string | null
  byStation: Map<string, PrecipAccumulatedItem>
  simulationDate: string | null
  loadedAt: number
  failedAt: number
  inFlight: Promise<void> | null
}

const precipAccumulatedState: PrecipAccumulatedState = {
  key: null,
  byStation: new Map(),
  simulationDate: null,
  loadedAt: 0,
  failedAt: 0,
  inFlight: null,
}

function toPrecipEndpointSource(source: MapDataSource): PrecipAccumulatedSource {
  if (source === 'observado') return 'observed'
  if (source === 'epsmedio') return 'eps'
  return 'harmonie'
}

function precipAccumulatedKey(
  source: PrecipAccumulatedSource,
  hours: PrecipAccumulatedHours
): string {
  return `${source}:${hours}`
}

async function loadCaudal(
  source: ReturnType<typeof useMapDataSourceStore>['selectedDataSource'],
  model: ReturnType<typeof useMapModelStore>['selectedModel']
): Promise<void> {
  if (source === 'observado') {
    await runSlot('caudal:obs', slots.caudal.obs, bestQObsAforosByStation, async () => {
      const [qAforos, qEmbalse] = await Promise.all([
        getMaxAndLatestValuesService('FICT98.historical'),
        getMaxAndLatestValuesService('FICT99.historical'),
      ])
      setBestByStation(bestQObsAforosByStation, qAforos)
      setBestByStation(bestQObsEmbalseByStation, qEmbalse)
    })
    return
  }

  if (source === 'harmonie') {
    if (model === 'mike11') {
      await runSlot('caudal:mk11H', slots.caudal.mk11H, bestQMk11HByStation, async () => {
        const [q, i] = await Promise.all([
          getMaxAndLatestValuesService('Q.mk11.forecast'),
          getMaxAndLatestValuesService('I.mk11.forecast'),
        ])
        setBestByStation(bestQMk11HByStation, q)
        setBestByStation(bestIMk11HByStation, i)
      })
      return
    }

    await runSlot('caudal:namH', slots.caudal.namH, bestQNamHByStation, async () => {
      const [q, i] = await Promise.all([
        getMaxAndLatestValuesService('Q.NAM.harmonie'),
        getMaxAndLatestValuesService('I.NAM.harmonie'),
      ])
      setBestByStation(bestQNamHByStation, q)
      setBestByStation(bestINamHByStation, i)
    })
    return
  }

  if (source === 'epsmedio') {
    if (model === 'mike11') {
      await runSlot('caudal:mk11E', slots.caudal.mk11E, bestQMk11EByStation, async () => {
        const [q, i] = await Promise.all([
          getMaxAndLatestValuesService('Q.mk11.EPSforecast'),
          getMaxAndLatestValuesService('I.mk11.EPSforecast'),
        ])
        setBestByStation(bestQMk11EByStation, q)
        setBestByStation(bestIMk11EByStation, i)
      })
      return
    }

    await runSlot('caudal:namE', slots.caudal.namE, bestQNamEByStation, async () => {
      const [q, i] = await Promise.all([
        getMaxAndLatestValuesService('Q.NAM.ens'),
        getMaxAndLatestValuesService('I.nam.ens'),
      ])
      setBestByStation(bestQNamEByStation, q)
      setBestByStation(bestINamEByStation, i)
    })
  }
}

async function loadPrecip(source: MapDataSource, hours: PrecipAccumulatedHours): Promise<void> {
  const endpointSource = toPrecipEndpointSource(source)
  const key = precipAccumulatedKey(endpointSource, hours)
  const sameKey = precipAccumulatedState.key === key

  const cacheIsFresh = sameKey && Date.now() - precipAccumulatedState.loadedAt < ALERT_CACHE_TTL_MS
  const inCooldown =
    sameKey && Date.now() - precipAccumulatedState.failedAt < ALERT_FAILURE_COOLDOWN_MS

  if (cacheIsFresh && precipAccumulatedState.byStation.size > 0) return
  if (inCooldown) return
  if (sameKey && precipAccumulatedState.inFlight) {
    await precipAccumulatedState.inFlight
    return
  }

  const inFlight = (async () => {
    const response = await getPrecipAccumulatedService(endpointSource, hours)
    precipAccumulatedState.key = key
    precipAccumulatedState.byStation = new Map(
      response.items.map((item) => [normalizeStationKey(item.stationId), item])
    )
    precipAccumulatedState.simulationDate = response.simulationDate
    saihAlertsVersion.value++
  })()

  precipAccumulatedState.inFlight = inFlight

  try {
    await inFlight
    precipAccumulatedState.loadedAt = Date.now()
    precipAccumulatedState.failedAt = 0
  } catch (err) {
    precipAccumulatedState.failedAt = Date.now()
    console.warn(`SAIH [precip:${key}] values unavailable. Retrying in 60s.`, err)
  } finally {
    precipAccumulatedState.inFlight = null
  }
}

export async function ensureSaihAlertsLoaded(): Promise<void> {
  const source = useMapDataSourceStore().selectedDataSource
  const model = useMapModelStore().selectedModel

  if (model === 'precipitacion') {
    await loadPrecip(source, useMapPrecipHorizonStore().selectedHours)
    return
  }

  await loadCaudal(source, model)
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
    // Observado only distinguishes Caudal vs Precipitación (no NAM/MIKE11
    // split) — when Precipitación is the active view there's no caudal
    // entry to report here, same as the harmonie/epsmedio branches below.
    bestEntry =
      model === 'precipitacion'
        ? undefined
        : isEmbalse
          ? bestQObsEmbalseByStation.get(stationCode)
          : bestQObsAforosByStation.get(stationCode)
  } else if (source === 'harmonie') {
    if (model === 'nam') {
      bestEntry = isEmbalse
        ? bestINamHByStation.get(stationCode)
        : bestQNamHByStation.get(stationCode)
    } else if (model === 'mike11') {
      bestEntry = isEmbalse
        ? bestIMk11HByStation.get(stationCode)
        : bestQMk11HByStation.get(stationCode)
    }
  } else if (source === 'epsmedio') {
    if (model === 'nam') {
      bestEntry = isEmbalse
        ? bestINamEByStation.get(stationCode)
        : bestQNamEByStation.get(stationCode)
    } else if (model === 'mike11') {
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

  // Forecasts are evaluated against their peak (maxValue) — the whole point
  // is to flag a station that WILL exceed a threshold at some point in the
  // horizon. Observado has no horizon, only a live reading: coloring it by
  // the historical max would keep a marker red after the river has already
  // receded below threshold, so it's evaluated against the latest value
  // instead — color tracks the current state, not a past peak.
  const comparisonValue = source === 'observado' ? bestEntry.latestValue : bestEntry.maxValue

  let backgroundColor: string | null = null
  if (thresholds.red != null && comparisonValue >= thresholds.red) backgroundColor = ALERT_RED
  else if (thresholds.orange != null && comparisonValue >= thresholds.orange)
    backgroundColor = ALERT_ORANGE
  else if (thresholds.yellow != null && comparisonValue >= thresholds.yellow)
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

// maxValue/maxDate are named for backward compatibility with callers (the
// map popup) — they now hold precip-accumulated's accumulated value and
// the end of the window it was measured over, for whichever source+hours
// combination is currently selected.
export function getSaihPrecipMaxInfo(feature: Feature): {
  maxValue: number | null
  maxDate: string | null
  simulationDate: string | null
} {
  const stationCode = getStationCode(feature)
  if (!stationCode) return { maxValue: null, maxDate: null, simulationDate: null }

  const source = useMapDataSourceStore().selectedDataSource
  const hours = useMapPrecipHorizonStore().selectedHours
  const expectedKey = precipAccumulatedKey(toPrecipEndpointSource(source), hours)

  // Guards against showing a stale combination's numbers while the newly
  // selected one is still in flight — precip-accumulated has only one
  // shared cache slot (unlike caudal's per-combo maps), so a mid-fetch read
  // would otherwise return the previous source/hours' data mislabeled as
  // the new one's.
  if (precipAccumulatedState.key !== expectedKey) {
    return { maxValue: null, maxDate: null, simulationDate: null }
  }

  const item = precipAccumulatedState.byStation.get(stationCode)
  if (!item) return { maxValue: null, maxDate: null, simulationDate: null }

  return {
    maxValue: item.accumulated,
    maxDate: item.windowEnd,
    simulationDate: precipAccumulatedState.simulationDate,
  }
}

function firstSimulationDate(map: Map<string, StationMaxLatestValue>): string | null {
  for (const entry of map.values()) {
    if (entry.simulationDate) return entry.simulationDate
  }
  return null
}

const MODEL_LABELS = {
  nam: 'Caudal NAM',
  mike11: 'Caudal MIKE',
  precipitacion: 'Precipitación',
} as const

const SOURCE_LABELS = {
  harmonie: 'Harmonie',
  epsmedio: 'EPS Medio',
} as const

// How often the backend refreshes each source's runs — not derivable from
// the API, fixed per source.
const UPDATE_FREQUENCY_HOURS = {
  harmonie: 6,
  epsmedio: 12,
} as const

export type CurrentSimulationInfo = {
  label: string
  simulationDate: string | null
  updateFrequencyHours: number
}

// Drives the bottom-right "last simulation date" map badge. Returns null
// for Observado — it's real measured data, not a model run, so there's no
// simulation date or update cadence to show.
export function getCurrentSimulationInfo(): CurrentSimulationInfo | null {
  const source = useMapDataSourceStore().selectedDataSource
  const model = useMapModelStore().selectedModel

  if (source === 'observado') return null
  if (model !== 'nam' && model !== 'mike11' && model !== 'precipitacion') return null

  let simulationDate: string | null

  if (model === 'precipitacion') {
    const hours = useMapPrecipHorizonStore().selectedHours
    const expectedKey = precipAccumulatedKey(toPrecipEndpointSource(source), hours)
    simulationDate =
      precipAccumulatedState.key === expectedKey ? precipAccumulatedState.simulationDate : null
  } else if (model === 'nam') {
    simulationDate =
      firstSimulationDate(source === 'harmonie' ? bestQNamHByStation : bestQNamEByStation) ??
      firstSimulationDate(source === 'harmonie' ? bestINamHByStation : bestINamEByStation)
  } else {
    simulationDate =
      firstSimulationDate(source === 'harmonie' ? bestQMk11HByStation : bestQMk11EByStation) ??
      firstSimulationDate(source === 'harmonie' ? bestIMk11HByStation : bestIMk11EByStation)
  }

  return {
    label: `${MODEL_LABELS[model]} ${SOURCE_LABELS[source]}`,
    simulationDate,
    updateFrequencyHours: UPDATE_FREQUENCY_HOURS[source],
  }
}
