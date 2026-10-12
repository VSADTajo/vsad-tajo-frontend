import { ref } from 'vue'
import type { Feature } from 'geojson'
import { getMaxAndLatestValuesService } from '@/services/predictions'
import type { StationMaxLatestValue } from '@/types/Predictions'
import { useMapDataSourceStore } from '@/stores/mapDataSourceStore'
import { useMapModelStore } from '@/stores/mapModelStore'

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

function makeSlot(): CacheSlot {
  return { loadedAt: 0, failedAt: 0, inFlight: null }
}

// Caudal (Q+I) and Precipitación load independently — the map only ever
// shows one of the two views at a time (MapView's model toggle), so on
// load only the active view's series get fetched instead of bundling both
// (plus the model that isn't even selected) into every request.
const slots = {
  caudal: {
    namH: makeSlot(),
    namE: makeSlot(),
    mk11H: makeSlot(),
    mk11E: makeSlot(),
    obs: makeSlot(),
  },
  precip: {
    harmonie: makeSlot(),
    epsmedio: makeSlot(),
    observado: makeSlot(),
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

async function loadPrecip(
  source: ReturnType<typeof useMapDataSourceStore>['selectedDataSource']
): Promise<void> {
  if (source === 'observado') {
    await runSlot('precip:observado', slots.precip.observado, bestPObsByStation, async () => {
      const p = await getMaxAndLatestValuesService('WI__01.historical')
      setBestByStation(bestPObsByStation, p)
    })
    return
  }

  if (source === 'harmonie') {
    await runSlot('precip:harmonie', slots.precip.harmonie, bestPHByStation, async () => {
      const p = await getMaxAndLatestValuesService('P.harmonie.forecast')
      setBestByStation(bestPHByStation, p)
    })
    return
  }

  if (source === 'epsmedio') {
    await runSlot('precip:epsmedio', slots.precip.epsmedio, bestPEByStation, async () => {
      const p = await getMaxAndLatestValuesService('P.ens.forecast')
      setBestByStation(bestPEByStation, p)
    })
  }
}

export async function ensureSaihAlertsLoaded(): Promise<void> {
  const source = useMapDataSourceStore().selectedDataSource
  const model = useMapModelStore().selectedModel

  if (model === 'precipitacion') {
    await loadPrecip(source)
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
    simulationDate = firstSimulationDate(source === 'harmonie' ? bestPHByStation : bestPEByStation)
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
