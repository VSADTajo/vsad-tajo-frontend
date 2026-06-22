import type L from 'leaflet'

const registry = new Map<string, L.Marker>()
let selectedCode: string | null = null
const simulationCodes = new Set<string>()

export function registerSaihMarker(code: string, marker: L.Marker): void {
  const upper = code.toUpperCase()
  registry.set(upper, marker)

  if (simulationCodes.has(upper)) {
    if (marker.getElement()) {
      marker.getElement()!.firstElementChild?.classList.add('is-simulation')
    } else {
      marker.once('add', () => {
        marker.getElement()?.firstElementChild?.classList.add('is-simulation')
      })
    }
  }
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

export function setSimulationMarkers(codes: string[] | null): void {
  simulationCodes.forEach((code) => {
    registry.get(code)?.getElement()?.firstElementChild?.classList.remove('is-simulation')
  })
  simulationCodes.clear()
  if (codes) {
    codes.forEach((code) => {
      const upper = code.toUpperCase()
      simulationCodes.add(upper)
      registry.get(upper)?.getElement()?.firstElementChild?.classList.add('is-simulation')
    })
  }
}
