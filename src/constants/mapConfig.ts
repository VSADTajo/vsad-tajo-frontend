import L from 'leaflet'
import { subDays, startOfDay, format } from 'date-fns'

export const center: L.LatLngExpression = [40.2268, -4.5938]

export const defaultZoom = 8
export const defaultZoomForMobile = 7

export const minZoom = 7

// A plain constant here would be computed once, the moment this module
// first loads — fine for a short session, but a long-lived dev/HMR session
// (or a browser tab left open for days) freezes it at whatever day that
// was, never advancing as real days pass. A function lets callers
// recompute "now minus 7 days" fresh at the moment a layer actually
// activates, instead of once at app startup.
export function getLayerStartEFAS(): string {
  return format(startOfDay(subDays(new Date(), 7)), "yyyy-MM-dd'T'HH:mm:ss")
}
