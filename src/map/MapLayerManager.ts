// MapLayerManager.ts
import L from 'leaflet'
import { dynamicLayersConfig } from '@/config/layers.config'
import { createLayer } from '@/services/geoserver'
import type { LayerConfig, LayerState, WMSLayerConfig } from '@/types/Layers'
import router from '@/router'
import { useTimeStore } from '@/stores/timeStore'
import { getLayerTimeDimension } from '@/services/efasWmsService'

export class MapLayerManager {
  private map: L.Map
  private activeLayers: Record<string, L.Layer> = {}
  private cache: Record<string, L.Layer> = {}
  private configMap = new Map(dynamicLayersConfig.map((c) => [c.id, c]))

  constructor(map: L.Map) {
    this.map = map
  }

  async sync(layersState: Record<string, LayerState>) {
    await this.handleGroupedLayers(layersState)
    await this.handleStandardLayers(layersState)

    this.normalizePaneOrder()
  }

  // ==============================
  // 🟦 Capas Agrupadas
  // ==============================

  private groupedLayers: Record<string, L.Layer> = {}

  private async handleGroupedLayers(layersState: Record<string, LayerState>) {
    for (const config of this.configMap.values()) {
      if (!config.groupBy) continue

      const { field, parentLayer } = config.groupBy

      const activeChildren = Object.values(layersState)
        .filter((l) => l.parentLayer === parentLayer && l.visible)
        .map((l) => l.id)

      // Si no hay hijos activos → limpiar capa
      if (!activeChildren.length) {
        const existing = this.groupedLayers[config.id]
        if (existing) {
          this.map.removeLayer(existing)
          delete this.groupedLayers[config.id]
        }
        continue
      }

      const cql = `${field} IN (${activeChildren.map((v) => `'${v}'`).join(',')})`

      const newLayer = await createLayer(config, {
        CQL_FILTER: cql,
      })

      if (!newLayer) continue

      const existing = this.groupedLayers[config.id]

      if (!existing) {
        newLayer.addTo(this.map)
        this.attachVectorClick(config.id, newLayer)
        this.groupedLayers[config.id] = newLayer
      } else {
        // Si es GeoJSON podemos actualizar datos
        if (existing instanceof L.GeoJSON && newLayer instanceof L.GeoJSON) {
          existing.clearLayers()
          existing.addData(newLayer.toGeoJSON())
        } else {
          // Para otros tipos, recreamos
          this.map.removeLayer(existing)
          newLayer.addTo(this.map)
          this.groupedLayers[config.id] = newLayer
        }
      }
    }
  }

  // ==============================
  // 🟩 Capas normales
  // ==============================

  private async handleStandardLayers(layersState: Record<string, LayerState>) {
    for (const layerState of Object.values(layersState)) {
      const isGroupedChild = Array.from(this.configMap.values()).some(
        (config) => config.groupBy && config.id === layerState.parentLayer
      )

      if (isGroupedChild) continue

      const config = this.configMap.get(layerState.id)
      if (!config) continue

      const existing = this.activeLayers[layerState.id]

      // Activar
      if (layerState.visible && !existing) {
        const layer = this.cache[layerState.id] ?? (await createLayer(config))
        if (!layer) continue

        layer.addTo(this.map)
        this.attachVectorClick(layerState.id, layer)
        this.activeLayers[layerState.id] = layer
        this.cache[layerState.id] = layer

        if (config.temporal) {
          this.loadTemporalDimension(config)
        }
      }

      // Desactivar
      if (!layerState.visible && existing) {
        this.map.removeLayer(existing)
        delete this.activeLayers[layerState.id]

        if (config.temporal) {
          const timeStore = useTimeStore()
          timeStore.removeLayerTime(layerState.id)
        }
      }

      this.updateVisualState(layerState)
    }
  }

  // ==============================
  // 🎨 Actualizar opacidad
  // ==============================

  private updateVisualState(layerState: LayerState) {
    const layer = this.activeLayers[layerState.id]
    if (!layer) return

    if (layer instanceof L.GeoJSON) {
      layer.setStyle({
        opacity: layerState.opacity,
        fillOpacity: layerState.opacity,
      })
    }

    if (layer instanceof L.TileLayer) {
      layer.setOpacity(layerState.opacity)
    }
  }

  private attachVectorClick(layerId: string, layer: L.Layer) {
    if (!(layer instanceof L.GeoJSON)) return

    layer.on('click', (e: L.LeafletMouseEvent & { layer: L.GeoJSON }) => {
      const feature = e.layer.feature as GeoJSON.Feature | undefined
      if (!feature) return

      this.handleFeatureClick(layerId, feature)
    })
  }

  private handleFeatureClick(layerId: string, feature: GeoJSON.Feature) {
    switch (layerId) {
      case 'saih':
        router.replace({
          query: {
            ...router.currentRoute.value.query,
            station: feature.properties?.CODIGO ? feature.properties.CODIGO : feature.id,
          },
        })
        break

      case 'estaciones':
        console.log('Abrir panel estaciones')
        break

      default:
        console.log('Capa sin comportamiento')
    }
  }

  private normalizePaneOrder() {
    Object.values(this.activeLayers).forEach((layer) => {
      if (layer instanceof L.GeoJSON) {
        layer.bringToBack()
      }
    })
  }

  private async loadTemporalDimension(config: LayerConfig) {
    try {
      const timeStore = useTimeStore()

      if (timeStore.layers[config.id]) return

      if (config.type !== 'WMS') return

      const layerName = (config as WMSLayerConfig).layers

      const time = await getLayerTimeDimension(layerName)

      if (time) {
        timeStore.setLayerTime(config.id, time)
      }
    } catch (err) {
      console.error('Error loading temporal dimension', err)
    }
  }
}
