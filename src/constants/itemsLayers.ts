import type { LayerNode } from '@/types/Layers'

export const zonasLayers: LayerNode[] = [
  {
    id: 'subcuencas',
    title: 'Subcuencas',
  },
  {
    id: 'sistemas10',
    title: 'Sistemas SAIH',
  },
  {
    id: 'zonasexpl',
    title: 'Zonas Explotación',
  },
  {
    id: 'meteoalerta',
    title: 'Zonas Meteoalerta',
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
  // {
  //   id: 'saica',
  //   title: 'SAICA',
  //   children: [
  //     { id: 'estacionCalidad', title: 'Estación de Calidad SAICA', parentLayer: 'saica' },
  //     { id: 'vertidos', title: 'Vertidos', parentLayer: 'saica' },
  //   ],
  // },
]

export const meteoMaps: LayerNode[] = [
  {
    id: 'eps',
    title: 'EPS',
    children: [
      {
        id: 'eps_nieve_agua_equiv_media',
        title: 'Nieve-Agua Media',
        parentLayer: 'eps',
        opacityEnabled: true,
        opacity: 1,
      },
      {
        id: 'eps_precipitacion_25',
        title: 'Precipitación 25',
        parentLayer: 'eps',
        opacityEnabled: true,
        opacity: 1,
      },
      {
        id: 'eps_precipitacion_75',
        title: 'Precipitación 75',
        parentLayer: 'eps',
        opacityEnabled: true,
        opacity: 1,
      },
      {
        id: 'eps_precipitacion_media',
        title: 'Precipitación Media',
        parentLayer: 'eps',
        opacityEnabled: true,
        opacity: 1,
      },

      {
        id: 'eps_precipitacion_media_acumulada',
        title: 'Precipitación Media Acumulada',
        parentLayer: 'eps',
        opacityEnabled: true,
        opacity: 1,
      },

      {
        id: 'eps_temperatura_media',
        title: 'Temperatura Media',
        parentLayer: 'eps',
        opacityEnabled: true,
        opacity: 1,
      },
    ],
  },
  {
    id: 'harmonie',
    title: 'HARMONIE',
    children: [
      {
        id: 'harmonie_cobertura_nieve',
        title: 'Cobertura Nieve',
        parentLayer: 'harmonie',
        opacityEnabled: true,
        opacity: 1,
      },
      {
        id: 'harmonie_nubosidad',
        title: 'Nubosidad',
        parentLayer: 'harmonie',
        opacityEnabled: true,
        opacity: 1,
      },
      {
        id: 'harmonie_precipitacion',
        title: 'Precipitaciones',
        parentLayer: 'harmonie',
        opacityEnabled: true,
        opacity: 1,
      },
      {
        id: 'harmonie_precipitacion_acumulada',
        title: 'Precipitaciones Acumulada',
        parentLayer: 'harmonie',
        opacityEnabled: true,
        opacity: 1,
      },
      {
        id: 'harmonie_rayos',
        title: 'Rayos',
        parentLayer: 'harmonie',
        opacityEnabled: true,
        opacity: 1,
      },
      {
        id: 'harmonie_temperatura',
        title: 'Temperatura',
        parentLayer: 'harmonie',
        opacityEnabled: true,
        opacity: 1,
      },
      {
        id: 'harmonie_viento',
        title: 'Viento',
        parentLayer: 'harmonie',
        opacityEnabled: true,
        opacity: 1,
      },
    ],
  },
  {
    id: 'radar',
    title: 'Radar',
    children: [
      {
        id: 'radar_precipitacion',
        title: 'Precipitaciones',
        parentLayer: 'radar',
        opacityEnabled: true,
        opacity: 1,
      },
    ],
  },
  {
    id: 'meteo_saih',
    title: 'SAIH',
    children: [
      {
        id: 'saih_precipitacion',
        title: 'Precipitaciones',
        parentLayer: 'meteo_saih',
        opacityEnabled: true,
        opacity: 1,
      },
    ],
  },
]

export const efasLayers: LayerNode[] = [
  {
    id: 'reportingpoints',
    title: 'Puntos de Notificación',
  },
  {
    id: 'rainDWD',
    title: 'Precip. Acum. Det. DWD',
    opacityEnabled: true,
    opacity: 1,
  },
  {
    id: 'rainEUD',
    title: 'Precip. Acum. Det. AIFS',
    opacityEnabled: true,
    opacity: 1,
  },
  {
    id: 'soilMoisture',
    title: 'Humedad del Suelo',
    opacityEnabled: true,
    opacity: 1,
  },
  {
    id: 'scWB',
    title: 'Equivalente de Agua en Nieve',
    opacityEnabled: true,
    opacity: 1,
  },
  {
    id: 'alDWD',
    title: 'Caudal Previsto Det. DWD',
    opacityEnabled: true,
    opacity: 1,
  },
  {
    id: 'alEUD',
    title: 'Caudal Previsto Det. AIFS',
    opacityEnabled: true,
    opacity: 1,
  },
  {
    id: 'floodInundationScenarios',
    title: 'Escenarios de Inundación',
    opacityEnabled: true,
    opacity: 1,
  },
]

export const avisosLayers: LayerNode[] = [
  {
    id: 'avisos_aemet',
    title: 'AEMET',
    emptyText: 'No hay avisos de AEMET',
    children: [
      { id: 'AT', title: 'Temperaturas máximas', parentLayer: 'avisos_aemet' },
      { id: 'BT', title: 'Temperaturas mínimas', parentLayer: 'avisos_aemet' },
      { id: 'PR', title: 'Lluvias', parentLayer: 'avisos_aemet' },
      { id: 'NE', title: 'Nevadas', parentLayer: 'avisos_aemet' },
      { id: 'VI', title: 'Vientos', parentLayer: 'avisos_aemet' },
      { id: 'TO', title: 'Tormentas', parentLayer: 'avisos_aemet' },
      { id: 'NI', title: 'Nieblas', parentLayer: 'avisos_aemet' },
      { id: 'CO', title: 'Fenómenos costeros', parentLayer: 'avisos_aemet' },
      { id: 'GA', title: 'Galernas', parentLayer: 'avisos_aemet' },
      { id: 'AL', title: 'Aludes', parentLayer: 'avisos_aemet' },
      { id: 'DH', title: 'Deshielos', parentLayer: 'avisos_aemet' },
      { id: 'VS', title: 'Polvo en suspensión', parentLayer: 'avisos_aemet' },
      { id: 'RI', title: 'Rissagas', parentLayer: 'avisos_aemet' },
    ],
  },
]
