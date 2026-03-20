import L from 'leaflet'
import type { Feature } from 'geojson'

export const saihPointStyle = (feature: Feature, latlng: L.LatLng) => {
  const tipo = feature.properties?.tipo_cod

  const color = tipo === 'AR' ? 'red' : 'blue'

  return L.circleMarker(latlng, {
    radius: 6,
    fillColor: color,
    color: '#fff',
    weight: 1,
    fillOpacity: 0.9,
  })
}

export const contornoStyle: L.PathOptions = {
  color: '#203d1c',
  weight: 2,
  fillColor: '#203d1c7c',
}

export const subcuencasStyle: L.PathOptions = {
  color: '#8d5d26',
  weight: 2,
  fillColor: '#ec9c417a',
}

export const sistemas10Style: L.PathOptions = {
  color: '#33a02c',
  weight: 2,
  fillColor: '#b2df8a98',
  fillOpacity: 0.2,
}

export const zonasexplStyle: L.PathOptions = {
  color: '#1f78b4',
  weight: 2,
  fillColor: '#a0c8e28f',
  fillOpacity: 0.2,
}
