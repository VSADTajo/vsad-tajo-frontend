import type L from 'leaflet'

const registry = new Map<string, L.Marker>()
let selectedCode: string | null = null
const simulationCodes = new Set<string>()
const downstreamCodes = new Set<string>()

export function registerSaihMarker(code: string, marker: L.Marker): void {
  const upper = code.toUpperCase()
  registry.set(upper, marker)

  const applyPersistentClasses = () => {
    if (simulationCodes.has(upper)) {
      marker.getElement()?.firstElementChild?.classList.add('is-simulation')
    }
    if (downstreamCodes.has(upper)) {
      marker.getElement()?.firstElementChild?.classList.add('is-downstream')
    }
  }

  if (marker.getElement()) {
    applyPersistentClasses()
  } else {
    marker.once('add', applyPersistentClasses)
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

export function isDownstreamStation(code: string): boolean {
  return downstreamCodes.has(code.toUpperCase())
}

export function setDownstreamMarkers(codes: string[] | null): void {
  downstreamCodes.forEach((code) => {
    registry.get(code)?.getElement()?.firstElementChild?.classList.remove('is-downstream')
  })
  downstreamCodes.clear()
  if (codes) {
    codes.forEach((code) => {
      const upper = code.toUpperCase()
      downstreamCodes.add(upper)
      registry.get(upper)?.getElement()?.firstElementChild?.classList.add('is-downstream')
    })
  }
}
