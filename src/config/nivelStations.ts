// Stations that get a third "Nivel"/"COTA" tab in the SAIH station panel,
// showing an observed level series alongside Hidrogramas/Precipitaciones.
// Fixed list, not exposed by any API — extend it as more stations with this
// data are identified.
//
// Two stations can share the same predictionType (LICT01.historical is used
// by MC01, MC02 and MC07) yet mean different things: MC01 reads as a plain
// water level ("Nivel", m), while MC02/MC07 read as an absolute elevation
// ("COTA", msnm) — this is a per-station distinction, not something
// derivable from the prediction type or the station code prefix.
export type NivelStationConfig = {
  predictionType: string
  label: 'Nivel' | 'COTA'
  unit: 'm' | 'msnm'
}

const NIVEL_STATIONS: ReadonlyMap<string, NivelStationConfig> = new Map([
  ['AR24', { predictionType: 'LI__01.historical', label: 'Nivel', unit: 'm' }],
  ['MC01', { predictionType: 'LICT01.historical', label: 'Nivel', unit: 'm' }],
  ['MC02', { predictionType: 'LICT01.historical', label: 'COTA', unit: 'msnm' }],
  ['MC07', { predictionType: 'LICT01.historical', label: 'COTA', unit: 'msnm' }],
  ['AR67', { predictionType: 'LICT01.historical', label: 'COTA', unit: 'msnm' }],
])

export function hasNivelTab(stationCode: string): boolean {
  return NIVEL_STATIONS.has(stationCode.trim().toUpperCase())
}

export function getNivelStationConfig(stationCode: string): NivelStationConfig | undefined {
  return NIVEL_STATIONS.get(stationCode.trim().toUpperCase())
}
