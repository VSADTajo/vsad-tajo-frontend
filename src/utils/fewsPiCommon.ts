import type { FewsPiEvent, FewsPiTimeSeries } from '@/types/FewsPiFile'
import type { PredictionResult, StationPrediction } from '@/types/Predictions'

// Shared low-level helpers for turning a single FEWS PI timeSeries entry into
// the app's StationPrediction shape — used by both the station parser
// (parseFewsPiFile.ts) and the areal precipitation parser
// (parseArealFewsPiFile.ts), since both read the exact same header/events
// structure and only differ in how they group/route the result.

export function combineDateTime(dt?: { date: string; time: string }): string {
  return dt ? `${dt.date}T${dt.time}` : ''
}

export function parseNumber(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function toPredictionResults(events: FewsPiEvent[], missVal: number): PredictionResult[] {
  const results: PredictionResult[] = []

  events.forEach((event, index) => {
    const value = parseNumber(event.value)
    if (!Number.isFinite(value) || value === missVal) return

    results.push({
      id: index,
      date: `${event.date}T${event.time}`,
      value,
      flag: Number.parseInt(event.flag ?? '0', 10),
    })
  })

  return results
}

export function toStationPrediction(series: FewsPiTimeSeries): StationPrediction {
  const { header, events = [] } = series
  const missVal = parseNumber(header.missVal)

  return {
    id: `${header.locationId}-${header.parameterId}`,
    stationId: header.locationId,
    stationName: header.stationName ?? header.locationId,
    predictionTypeName: header.parameterId,
    simulationDate: combineDateTime(header.forecastDate) || combineDateTime(header.startDate),
    predictionDate: combineDateTime(header.startDate),
    predictionProvider: header.moduleInstanceId ?? '',
    predictedBy: header.moduleInstanceId ?? '',
    results: toPredictionResults(events, missVal),
  }
}
