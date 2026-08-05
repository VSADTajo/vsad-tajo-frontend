import type { FewsPiFile, FewsPiTimeSeries } from '@/types/FewsPiFile'
import type { LocalArealArea } from '@/types/LocalArealFile'
import type { DataStationPrediction } from '@/types/Predictions'
import { toStationPrediction } from '@/utils/fewsPiCommon'

// Sistema/subcuenca/zona-meteoalerta locationIds are hierarchical
// ("Sistema.Tajo.1", "Cuenca.NAM.E_45", "Cuenca.AEMET.17") — unlike station
// codes (AR01, P_06...) they always contain a dot, which is what
// localFileStore uses to decide whether a FEWS file holds station series or
// areal precipitation series.
export function isArealLocationId(locationId: string): boolean {
  return /^(Sistema|Cuenca)\./.test(locationId)
}

// Maps an areal parameterId to the DataStationPrediction slot it feeds.
// Observed so far: "P.areal.obs.sis10.1h.v", "P.areal.harmonie.sis10", and
// "P.areal.ens.sis10.Med" — the EPS one has a variable subtype segment
// ("sis10") before the stat, so the stat is read as whatever the *last*
// dot-separated segment is rather than assuming a fixed position.
function resolveArealPredictionKey(parameterId: string): keyof DataStationPrediction | undefined {
  if (parameterId.startsWith('P.areal.obs')) return 'historical'
  if (parameterId.startsWith('P.areal.harmonie')) return 'forecastHarmonie'
  if (!parameterId.startsWith('P.areal.ens')) return undefined

  const stat = parameterId.split('.').pop()?.toUpperCase() ?? ''
  if (stat === 'P10') return 'forecastEnsP10'
  if (stat === 'P25') return 'forecastEnsP25'
  if (stat === 'P75') return 'forecastEnsP75'
  if (stat === 'P90') return 'forecastEnsP90'
  return 'forecastEpsat'
}

function toLocalArealArea(locationId: string, seriesList: FewsPiTimeSeries[]): LocalArealArea {
  const predictions: DataStationPrediction = {}

  for (const series of seriesList) {
    const key = resolveArealPredictionKey(series.header.parameterId)
    if (!key) continue
    predictions[key] = toStationPrediction(series)
  }

  return {
    id: locationId,
    name: seriesList[0].header.stationName ?? locationId,
    predictions,
  }
}

// Groups the file's flat timeSeries list by area (locationId is already the
// area's own identity here — no station-style "P suffix" normalization
// applies), merging every variable (obs, harmonie, eps) into one area.
export function parseArealFewsPiFile(file: FewsPiFile): LocalArealArea[] {
  const byLocation = new Map<string, FewsPiTimeSeries[]>()

  for (const series of file.timeSeries) {
    const locationId = series.header?.locationId
    if (!locationId) continue

    const list = byLocation.get(locationId) ?? []
    list.push(series)
    byLocation.set(locationId, list)
  }

  return [...byLocation.entries()].map(([locationId, seriesList]) =>
    toLocalArealArea(locationId, seriesList)
  )
}
