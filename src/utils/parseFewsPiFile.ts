import type { FewsPiFile, FewsPiTimeSeries } from '@/types/FewsPiFile'
import type { LocalFileStation } from '@/types/LocalStationsFile'
import type { DataStationPrediction } from '@/types/Predictions'
import { baseStationCode, stationTypeFromCode } from '@/utils/localStationCode'
import { parseNumber, toStationPrediction } from '@/utils/fewsPiCommon'

// Maps a FEWS parameterId to the DataStationPrediction slot it feeds.
// Extend this as later phases bring caudal/volumen files (Q.NAM.*, V.MIKE11.*, ...).
const PARAMETER_TO_PREDICTION_KEY: Record<string, keyof DataStationPrediction> = {
  'P.harmonie.forecast': 'forecastHarmonie',
  'P.ens.forecast': 'forecastEpsat',
  'Q.NAM.harmonie': 'forecastHarmonie',
  'I.NAM.harmonie': 'forecastHarmonie',
  'Q.NAM.ens': 'forecastEpsat',
  'I.NAM.ens.medio': 'forecastEpsat',
  'I.NAM.ens': 'forecastEpsat',
  'Q.mk11.forecast': 'forecastHarmonie',
  'Q.mk11.EPSforecast': 'forecastEpsat',
  'Q.mk11.EPS25forecast': 'forecastEnsP25',
  'Q.mk11.EPS75forecast': 'forecastEnsP75',
  'I.mk11.forecast': 'forecastHarmonie',
  'I.mk11.EPSforecast': 'forecastEpsat',
  'I.mk11.EPS25forecast': 'forecastEnsP25',
  'I.mk11.EPS75forecast': 'forecastEnsP75',
  'V.MIKE11.harmonie_acum': 'forecastHarmonie',
  'V.MIKE11.ens.medio_acum': 'forecastEpsat',
  'V.MIKE11.25.medio_acum': 'forecastEnsP25',
  'V.MIKE11.75.medio_acum': 'forecastEnsP75',
  'V.NAM.harmonie_acum': 'forecastHarmonie',
}

// EPS/ENS series sometimes carry a suffix on top of the base parameterId
// (observed so far: "P.ens.forecast.Med" for the mean series, "Q.NAM.ens.Med")
// instead of a clean match against PARAMETER_TO_PREDICTION_KEY. Resolve those
// generically so any future ".P10"/".P25"/... suffix also lands on the right
// percentile — including the volume EPS ("V.NAM.ens_acum[.Med]"), guessed by
// analogy with "V.NAM.harmonie_acum" until a real sample confirms it.
function resolvePredictionKey(parameterId: string): keyof DataStationPrediction | undefined {
  const direct = PARAMETER_TO_PREDICTION_KEY[parameterId]
  if (direct) return direct

  const ensMatch =
    /^(?:P\.ens\.forecast|Q\.NAM\.ens|I\.NAM\.ens|V\.NAM\.ens_acum)(?:\.(\w+))?$/.exec(parameterId)
  if (!ensMatch) return undefined

  const suffix = (ensMatch[1] ?? '').toUpperCase()
  if (suffix === 'P10') return 'forecastEnsP10'
  if (suffix === 'P25') return 'forecastEnsP25'
  if (suffix === 'P75') return 'forecastEnsP75'
  if (suffix === 'P90') return 'forecastEnsP90'
  return 'forecastEpsat'
}

function isPrecipitationParameter(parameterId: string): boolean {
  return parameterId.startsWith('P.')
}

function isVolumeParameter(parameterId: string): boolean {
  return parameterId.startsWith('V.')
}

// Same reasoning as predictionsCaudal vs predictionsPrecipitacion: an embalse
// can carry both caudal/nivel (Q./I.) and volumen (V.) at once, and the live
// app already keeps those as separate composables/refs — merging them here
// would make one overwrite the other on keys like forecastHarmonie.
function predictionTarget(
  parameterId: string,
  buckets: {
    caudal: DataStationPrediction
    volumen: DataStationPrediction
    precipitacion: DataStationPrediction
  }
): DataStationPrediction {
  if (isPrecipitationParameter(parameterId)) return buckets.precipitacion
  if (isVolumeParameter(parameterId)) return buckets.volumen
  return buckets.caudal
}

function toLocalFileStation(stationCode: string, seriesList: FewsPiTimeSeries[]): LocalFileStation {
  // Prefer the caudal/nivel series for the station's identity (name, coords);
  // fall back to the precip sensor's header if that's all there is.
  const primary =
    seriesList.find((s) => !isPrecipitationParameter(s.header.parameterId))?.header ??
    seriesList[0].header

  const predictionsCaudal: DataStationPrediction = {}
  const predictionsVolumen: DataStationPrediction = {}
  const predictionsPrecipitacion: DataStationPrediction = {}

  for (const series of seriesList) {
    const key = resolvePredictionKey(series.header.parameterId)
    if (!key) continue

    const target = predictionTarget(series.header.parameterId, {
      caudal: predictionsCaudal,
      volumen: predictionsVolumen,
      precipitacion: predictionsPrecipitacion,
    })
    target[key] = toStationPrediction(series)
  }

  const latitude = parseNumber(primary.lat)
  const longitude = parseNumber(primary.lon)
  const tipoCod = stationTypeFromCode(stationCode)

  return {
    id: stationCode,
    name: primary.stationName ?? stationCode,
    stationCode,
    stationType: tipoCod,
    tipoCod,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    predictionsCaudal: Object.keys(predictionsCaudal).length > 0 ? predictionsCaudal : undefined,
    predictionsVolumen: Object.keys(predictionsVolumen).length > 0 ? predictionsVolumen : undefined,
    predictionsPrecipitacion:
      Object.keys(predictionsPrecipitacion).length > 0 ? predictionsPrecipitacion : undefined,
  }
}

// Groups the file's flat timeSeries list by station, normalizing away the
// "P" precip-sensor suffix so a caudal series ("AR01") and its colocated
// precip series ("AR01P") land on the same LocalFileStation.
export function fewsPiFileToStations(file: FewsPiFile): LocalFileStation[] {
  const byLocation = new Map<string, FewsPiTimeSeries[]>()

  for (const series of file.timeSeries) {
    const locationId = series.header?.locationId
    if (!locationId) continue

    const code = baseStationCode(locationId)
    const list = byLocation.get(code) ?? []
    list.push(series)
    byLocation.set(code, list)
  }

  return [...byLocation.entries()].map(([code, seriesList]) => toLocalFileStation(code, seriesList))
}
