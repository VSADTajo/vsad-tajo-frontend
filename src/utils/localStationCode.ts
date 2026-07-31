// Shared station-code helpers used by every local-file parser (FEWS JSON,
// observed CSV...) so the same physical station is always identified the
// same way regardless of which file format it came from.

// Station codes follow a `<TIPO><numero>` convention (P_06, AR50, MC12...);
// the leading letters identify the SAIH type used for marker color/shape.
export function stationTypeFromCode(code: string): string {
  const match = /^[A-Za-z]+/.exec(code)
  return (match?.[0] ?? '').toUpperCase()
}

// A station's own precipitation sensor is sometimes filed under
// `<TIPO><numero>P` (e.g. caudal "AR01" vs its colocated precip sensor
// "AR01P") — same physical station, so both must resolve to the same code.
// Doesn't collide with standalone precip stations like "P_06" (underscore
// form, no trailing digits+P).
export function baseStationCode(code: string): string {
  const match = /^([A-Za-z]+\d+)P$/.exec(code)
  return match ? match[1] : code
}
