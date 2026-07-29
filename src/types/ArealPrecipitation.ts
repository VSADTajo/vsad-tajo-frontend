export interface ArealPrecipEventPoint {
  eventDate: string
  value: number
  flag: number
}

export interface ArealPrecipSeries {
  id: string
  locationId: string
  parameterId: string
  provider: string
  layer: string
  stat: string
  accumulation: string
  forecastDate: string
  startDate: string
  endDate: string
  moduleInstanceId: string
  stationName: string
  lat: number
  lon: number
  units: string
  timeStepSeconds: number
  creationDate: string
  approvedDate: string
  sourceFileName: string
  max: ArealPrecipEventPoint
  last: ArealPrecipEventPoint
  events: ArealPrecipEventPoint[]
}

export interface ArealPrecipGroup {
  provider: string
  accumulation: string
  stat: string
  series: ArealPrecipSeries[]
}

export interface ArealPrecipResponse {
  locationId: string
  groups: ArealPrecipGroup[]
}
