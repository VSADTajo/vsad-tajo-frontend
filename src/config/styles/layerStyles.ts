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

export const subcuencasStyle: L.PathOptions = {
  color: '#1f78b4',
  weight: 2,
  fill: false,
}

export const sistemas10Style: L.PathOptions = {
  color: '#33a02c',
  weight: 2,
  fillColor: '#b2df8a',
  fillOpacity: 0.6,
}

export const zonasexplStyle: L.PathOptions = {
  color: '#1f78b4',
  weight: 2,
  fillColor: '#a0c8e2',
  fillOpacity: 0.6,
}
