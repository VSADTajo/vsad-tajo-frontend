import type { LayerNode } from '@/types/Layers'

export const zonasLayers: LayerNode[] = [
  {
    id: 'subcuencas',
    title: 'Subcuencas',
  },
  {
    id: 'sistemas10',
    title: 'Sistemas 10',
  },
  {
    id: 'zonasexpl',
    title: 'Zonas Expl',
  },
]

export const stationLayers: LayerNode[] = [
  {
    id: 'saih',
    title: 'SAIH',
    children: [
      { id: 'AR', title: 'Aforo en Río', parentLayer: 'saih' },
      { id: 'AC', title: 'Aforo en Canal', parentLayer: 'saih' },
      { id: 'E', title: 'Embalse', parentLayer: 'saih' },
      { id: 'I', title: 'Impulsiones', parentLayer: 'saih' },
      { id: 'NV', title: 'Nivómetro', parentLayer: 'saih' },
      { id: 'P', title: 'Pluviómetro', parentLayer: 'saih' },
      { id: 'MC', title: 'Marco de Control', parentLayer: 'saih' },
      { id: 'PN', title: 'Pluvinimómetro', parentLayer: 'saih' },
    ],
  },
  {
    id: 'saica',
    title: 'SAICA',
    children: [
      { id: 'estacionCalidad', title: 'Estación de Calidad SAICA', parentLayer: 'saica' },
      { id: 'vertidos', title: 'Vertidos', parentLayer: 'saica' },
    ],
  },
]

export const efasLayers: LayerNode[] = [
  {
    id: 'reportingpoints',
    title: 'Reporting Points',
  },
  {
    id: 'rainDWD',
    title: 'Acc. Precip. Det. DWD',
    opacityEnabled: true,
    opacity: 1,
  },
  {
    id: 'rainEUD',
    title: 'Acc. Precip. Det. AIFS Single',
    opacityEnabled: true,
    opacity: 1,
  },
  {
    id: 'soilMoisture',
    title: 'Soil Moisture',
    opacityEnabled: true,
    opacity: 1,
  },
  {
    id: 'scWB',
    title: 'Snow Water Equivalent',
    opacityEnabled: true,
    opacity: 1,
  },
  {
    id: 'alDWD',
    title: 'Det. DWD',
    opacityEnabled: true,
    opacity: 1,
  },
  {
    id: 'alEUD',
    title: 'AIFS Single',
    opacityEnabled: true,
    opacity: 1,
  },
]
