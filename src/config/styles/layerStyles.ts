import L from 'leaflet'
import type { Feature } from 'geojson'
import type { LayerStyle } from '@/types/Layers'

export const saihPointStyle = (feature: Feature, latlng: L.LatLng) => {
  const tipo = feature.properties?.tipo_cod
  const color = tipo === 'AR' ? '#e63946' : '#1d6fa4'

  return L.circleMarker(latlng, {
    radius: 6,
    fillColor: color,
    color: '#fff',
    weight: 1,
    fillOpacity: 0.9,
  })
}

export const contornoStyle: LayerStyle = {
  normal: {
    color: '#203d1c',
    weight: 2,
    fillColor: '#203d1c',
    fillOpacity: 0.38,
  },
  highlight: {
    color: '#203d1c',
    weight: 2,
    fillColor: '#203d1c',
    fillOpacity: 0.38,
  },
}

export const subcuencasStyle: LayerStyle = {
  normal: {
    color: '#8d5d26',
    opacity: 1,
    weight: 2,
    fillColor: '#ec9c41',
    fillOpacity: 0.48,
  },
  highlight: {
    color: '#5c3a10',
    opacity: 1,
    weight: 3,
    fillColor: '#ec9c41',
    fillOpacity: 0.72,
  },
}

export const sistemas10Style: LayerStyle = {
  normal: {
    color: '#33a02c',
    weight: 2,
    fillColor: '#b2df8a',
    fillOpacity: 0.2,
  },
  highlight: {
    color: '#1a5c16',
    weight: 3,
    fillColor: '#b2df8a',
    fillOpacity: 0.55,
  },
}

export const zonasexplStyle: LayerStyle = {
  normal: {
    color: '#1f78b4',
    weight: 2,
    fillColor: '#a0c8e2',
    fillOpacity: 0.2,
  },
  highlight: {
    color: '#0d4a75',
    weight: 3,
    fillColor: '#a0c8e2',
    fillOpacity: 0.55,
  },
}
