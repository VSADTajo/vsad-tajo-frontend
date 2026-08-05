// Shape of the FEWS PI-XML-style JSON files exported by the backend for
// station data (precipitación, and later caudal/volumen): a flat list of
// timeSeries, one per station+variable combination, identified by
// header.locationId / header.parameterId.

export interface FewsPiDateTime {
  date: string
  time: string
}

export interface FewsPiHeader {
  type?: string
  moduleInstanceId?: string
  locationId: string
  parameterId: string
  timeStep?: { unit: string; multiplier: string }
  startDate?: FewsPiDateTime
  endDate?: FewsPiDateTime
  forecastDate?: FewsPiDateTime
  missVal: string
  stationName?: string
  lat: string
  lon: string
  x?: string
  y?: string
  z?: string
  units?: string
  creationDate?: string
  creationTime?: string
  approvedDate?: FewsPiDateTime
}

export interface FewsPiEvent {
  date: string
  time: string
  value: string
  flag?: string
}

export interface FewsPiTimeSeries {
  header: FewsPiHeader
  events?: FewsPiEvent[]
}

export interface FewsPiFile {
  version?: string
  timeZone?: string
  timeSeries: FewsPiTimeSeries[]
}

export function isFewsPiFile(value: unknown): value is FewsPiFile {
  if (!value || typeof value !== 'object') return false
  const timeSeries = (value as { timeSeries?: unknown }).timeSeries
  return Array.isArray(timeSeries)
}
