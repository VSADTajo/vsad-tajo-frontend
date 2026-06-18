import type L from 'leaflet'

const registry = new Map<string, L.Marker>()
let selectedCode: string | null = null

export function registerSaihMarker(code: string, marker: L.Marker): void {
  registry.set(code.toUpperCase(), marker)
}

export function setSaihMarkerHighlight(code: string | null): void {
  registry.forEach((marker) => {
    marker.getElement()?.firstElementChild?.classList.remove('is-highlight')
  })
  if (code) {
    const marker = registry.get(code.toUpperCase())
    marker?.getElement()?.firstElementChild?.classList.add('is-highlight')
  }
}

export function setSaihMarkerSelected(code: string | null): void {
  if (selectedCode) {
    const old = registry.get(selectedCode.toUpperCase())
    old?.getElement()?.firstElementChild?.classList.remove('is-selected')
  }
  selectedCode = code
  if (code) {
    const marker = registry.get(code.toUpperCase())
    marker?.getElement()?.firstElementChild?.classList.add('is-selected')
  }
}
