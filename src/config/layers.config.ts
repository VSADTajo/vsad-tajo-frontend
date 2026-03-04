import type { LayerConfig } from '@/types/Layers'

export const baseLayersConfig: LayerConfig[] = [
  {
    id: 'rios',
    name: 'Ríos',
    type: 'WMS',
    url: 'http://localhost:8080/geoserver/Tajo/wms',
    layers: 'Tajo:CHT_Rios',
    opacity: 1,
    zIndex: 15,
  },
  {
    id: 'cuenca',
    name: 'Cuenca',
    type: 'WMS',
    url: 'http://localhost:8080/geoserver/Tajo/wms',
    layers: 'Tajo:CHT_Cuenca',
    opacity: 1,
    zIndex: 10,
  },
]

export const dynamicLayersConfig: LayerConfig[] = [
  {
    id: 'subcuencas',
    name: 'Subcuencas',
    type: 'WFS',
    url: 'http://localhost:8080/geoserver/Tajo/ows',
    typeName: 'Tajo:Cuencas_NAM_2015',
    zIndex: 10,
  },
  {
    id: 'sistemas10',
    name: 'Sistemas 10',
    type: 'WFS',
    url: 'http://localhost:8080/geoserver/Tajo/ows',
    typeName: 'Tajo:CHT_Sistemas10',
    zIndex: 10,
  },
  {
    id: 'zonasexpl',
    name: 'Zonas Expl',
    type: 'WFS',
    url: 'http://localhost:8080/geoserver/Tajo/ows',
    typeName: 'Tajo:CHT_Zonas_Expl',
    zIndex: 10,
  },
  {
    id: 'saih',
    name: 'SAIH',
    type: 'WFS',
    url: 'http://localhost:8080/geoserver/Tajo/ows',
    typeName: 'Tajo:Puntos_SAIH',
    zIndex: 100,
    groupBy: {
      field: 'TIPO_COD',
      parentLayer: 'saih',
    },
  },
]
