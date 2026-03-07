import type { LayerConfig } from '@/types/Layers'
import {
  saihPointStyle,
  subcuencasStyle,
  sistemas10Style,
  zonasexplStyle,
} from './styles/layerStyles'
import { MAP_PANES } from '@/config/panes/mapPanes'

export const baseLayersConfig: LayerConfig[] = [
  {
    id: 'cuenca',
    name: 'Cuenca',
    type: 'WMS',
    url: 'http://localhost:8080/geoserver/Tajo/wms',
    layers: 'Tajo:cht_cuenca',
    opacity: 1,
    pane: MAP_PANES.BASELAYER,
  },
]

export const dynamicLayersConfig: LayerConfig[] = [
  {
    id: 'rios',
    name: 'Ríos',
    type: 'WMS',
    url: 'http://localhost:8080/geoserver/Tajo/wms',
    layers: 'Tajo:cht_rios',
    opacity: 1,
    pane: MAP_PANES.LINES,
  },
  {
    id: 'subcuencas',
    name: 'Subcuencas',
    type: 'WFS',
    url: 'http://localhost:8080/geoserver/Tajo/ows',
    typeName: 'Tajo:cht_subcuencas',
    style: subcuencasStyle,
    pane: MAP_PANES.POLYGONS,
  },
  {
    id: 'sistemas10',
    name: 'Sistemas 10',
    type: 'WFS',
    url: 'http://localhost:8080/geoserver/Tajo/ows',
    typeName: 'Tajo:cht_sistemas10',
    style: sistemas10Style,
    pane: MAP_PANES.POLYGONS,
  },
  {
    id: 'zonasexpl',
    name: 'Zonas Expl',
    type: 'WFS',
    url: 'http://localhost:8080/geoserver/Tajo/ows',
    typeName: 'Tajo:cht_zonas_expl',
    style: zonasexplStyle,
    pane: MAP_PANES.POLYGONS,
  },
  {
    id: 'saih',
    name: 'SAIH',
    type: 'WFS',
    url: 'http://localhost:8080/geoserver/Tajo/ows',
    typeName: 'Tajo:cht_puntos_saih',
    pane: MAP_PANES.POINTS,
    pointToLayer: saihPointStyle,
    groupBy: {
      field: 'tipo_cod',
      parentLayer: 'saih',
    },
  },
]
