export interface LayerNode {
  id: string
  title: string
  children?: LayerNode[]
  parentLayer?: string
  opacityEnabled?: boolean
  opacity?: number
}

export interface LayerState {
  id: string
  visible: boolean
  opacity: number
  parentLayer?: string
  params?: Partial<TimeParams> // para temporales
}

export interface TimeParams {
  time: string
  step: number
}

interface GroupBy {
  field: string
  parentLayer: string
}

interface BaseLayerConfig {
  id: string
  name: string
  url: string
  opacity?: number
  groupBy?: GroupBy
  pane?: string
  temporal?: boolean
}

export interface WMSLayerConfig extends BaseLayerConfig {
  type: 'WMS'
  layers: string
  format?: string
  styles?: string
  transparent?: boolean
  version?: string
  crs?: L.CRS
  token?: string
  crossOrigin?: boolean
  bbox?: L.LatLngBoundsExpression
}

export interface WFSLayerConfig extends BaseLayerConfig {
  type: 'WFS'
  typeName: string
  cql?: string
  style?: L.PathOptions
  pointToLayer?: (feature: GeoJSON.Feature, latlng: L.LatLng) => L.Layer
}

export interface TMSLayerConfig extends BaseLayerConfig {
  type: 'TMS'
}

export type LayerConfig = WMSLayerConfig | WFSLayerConfig | TMSLayerConfig
