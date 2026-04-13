// MapLayerManager.ts
import L from 'leaflet'
import { dynamicLayersConfig } from '@/config/layers.config'
import { createLayer } from '@/services/geoserver'
import type { LayerConfig, LayerState, WMSLayerConfig } from '@/types/Layers'
import router from '@/router'
import {
  buildFeatureInfoUrl,
  getLayerLegendUrl,
  getLayerTimeDimension,
} from '@/services/efasWmsService'
import { LegendManager } from './LegendManager'
import { useLayersStore } from '@/stores/layersStore'
import { subHours, isAfter, parseISO } from 'date-fns'
import { useReportingPointStore } from '@/stores/reportingPointsStore'
import { MAP_PANES } from '@/config/panes/mapPanes'

export class MapLayerManager {
  private map: L.Map
  private legendManager: LegendManager
  private activeLayers: Record<string, L.Layer> = {}
  private cache: Record<string, L.Layer> = {}
  private configMap = new Map(dynamicLayersConfig.map((c) => [c.id, c]))

  constructor(map: L.Map) {
    this.map = map
    this.legendManager = new LegendManager(map)
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
  private layerGeneration: Record<string, number> = {}

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

  private temporalLayers: Record<string, L.TileLayer.WMS[]> = {}

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
        if (config.temporal) {
          await this.loadTemporalDimension(config)
        }

        const layerStateObj = layersState[layerState.id]

        // Si sigue sin time → NO crear capa
        const time = layerStateObj?.params?.time

        if (config.temporal && !time) {
          return
        }
        // Crear capa YA con time correcto
        const layer = this.cache[layerState.id] ?? (await createLayer(config, time ? { time } : {}))

        if (!layer) continue

        layer.addTo(this.map)

        this.attachVectorClick(layerState.id, layer)
        this.attachWMSClick(layerState.id, layer)

        this.activeLayers[layerState.id] = layer
        this.cache[layerState.id] = layer

        if (
          layerState.id === 'subcuencas' ||
          layerState.id === 'sistemas10' ||
          layerState.id === 'zonasexpl'
        ) {
          const pane = this.map.getPane(MAP_PANES.CONTORNO)
          if (pane) {
            pane.style.display = 'none'
          }
        }

        if (config.type === 'WMS' && config.legend === 'efas') {
          const layerName = (config as WMSLayerConfig).layers

          const legendUrl = getLayerLegendUrl(layerName)

          this.legendManager.addLegend(config.id, legendUrl)
        }
      }

      // Desactivar
      if (!layerState.visible && existing) {
        this.layerGeneration[layerState.id]++

        this.map.removeLayer(existing)
        delete this.activeLayers[layerState.id]

        const temporals = this.temporalLayers[layerState.id]
        if (temporals) {
          temporals.forEach((l) => this.map.removeLayer(l))
          delete this.temporalLayers[layerState.id]
        }

        if (layerState.temporal) {
          layerState.temporal = undefined
        }

        if (layerState.params?.time) {
          delete layerState.params.time
        }

        this.legendManager.removeLegend(layerState.id)

        if (
          layerState.id === 'subcuencas' ||
          layerState.id === 'sistemas10' ||
          layerState.id === 'zonasexpl'
        ) {
          // Solo restaurar CONTORNO si NO queda activo ninguno del grupo
          const anyGroupActive = Object.values(layersState).some(
            (l) =>
              l.visible && (l.id === 'subcuencas' || l.id === 'sistemas10' || l.id === 'zonasexpl')
          )

          if (!anyGroupActive) {
            const pane = this.map.getPane(MAP_PANES.CONTORNO)
            if (pane) {
              pane.style.display = ''
            }
          }
        }
      }

      this.updateOpacityState(layerState)
      await this.updateTimeState(layerState)
    }
  }

  // ==============================
  // 🎨 Actualizar opacidad
  // ==============================

  private updateOpacityState(layerState: LayerState) {
    const layer = this.activeLayers[layerState.id]
    const config = this.configMap.get(layerState.id)

    if (!layer) return

    if (layer instanceof L.GeoJSON) {
      const baseOpacity = config?.type === 'WFS' ? (config.style?.normal.opacity ?? 1) : 1
      const baseFillOpacity = config?.type === 'WFS' ? (config.style?.normal.fillOpacity ?? 1) : 1

      layer.setStyle({
        opacity: baseOpacity * layerState.opacity,
        fillOpacity: baseFillOpacity * layerState.opacity,
      })
    }

    if (layer instanceof L.TileLayer) {
      layer.setOpacity(layerState.opacity)
    }
  }

  // ==============================
  // 🎨 Actualizar Tiempo
  // ==============================

  private async updateTimeState(layerState: LayerState) {
    if (!layerState.visible) return

    const current = this.activeLayers[layerState.id]

    if (!current) return
    if (!(current instanceof L.TileLayer.WMS)) return

    const newTime = layerState.params?.time
    if (!newTime) return

    const currentTime = (current.wmsParams as unknown as Record<string, unknown>)?.time

    if (currentTime === newTime) return

    if (!layerState.params?.time) return

    const config = this.configMap.get(layerState.id)
    if (!config) return

    const createdLayer = await createLayer(config, { time: layerState.params.time })

    if (!createdLayer) return
    if (!(createdLayer instanceof L.TileLayer.WMS)) return

    const newLayer = createdLayer

    newLayer.setOpacity(0)
    newLayer.addTo(this.map)

    // Guardamos layers temporales
    if (!this.temporalLayers[layerState.id]) {
      this.temporalLayers[layerState.id] = []
    }

    const layers = this.temporalLayers[layerState.id]

    layers.push(newLayer)

    // mantener solo 2 layers (actual + anterior)
    if (layers.length > 2) {
      const old = layers.shift()
      if (old) this.map.removeLayer(old)
    }

    const gen = (this.layerGeneration[layerState.id] ?? 0) + 1
    this.layerGeneration[layerState.id] = gen

    newLayer.once('load', () => {
      //si la capa ya no es válida → salir
      if (this.layerGeneration[layerState.id] !== gen) {
        this.map.removeLayer(newLayer)
        return
      }

      if (!layerState.visible) {
        this.map.removeLayer(newLayer)
        return
      }

      // Fade in
      this.fadeLayer(newLayer, 1)

      // Fade out anterior
      this.fadeLayer(current, 0, () => {
        this.map.removeLayer(current)
      })

      this.activeLayers[layerState.id] = newLayer
    })
  }

  private fadeLayer(layer: L.TileLayer, targetOpacity: number, onEnd?: () => void) {
    let opacity = layer.options.opacity ?? 1
    const step = targetOpacity > opacity ? 0.1 : -0.1

    const interval = setInterval(() => {
      opacity += step
      layer.setOpacity(opacity)

      if ((step > 0 && opacity >= targetOpacity) || (step < 0 && opacity <= targetOpacity)) {
        layer.setOpacity(targetOpacity)
        clearInterval(interval)
        onEnd?.()
      }
    }, 50)
  }

  private attachWMSClick(layerId: string, layer: L.Layer) {
    if (!(layer instanceof L.TileLayer.WMS)) return

    this.map.on('click', async (e: L.LeafletMouseEvent) => {
      const url = buildFeatureInfoUrl(this.map, layer, e.latlng)

      try {
        const res = await fetch(url)
        const data = await res.text()

        if (!data) return

        this.handleWMSClick(layerId, data)
      } catch (err) {
        console.error(err)
      }
    })
  }

  private extractStationId(html: string): string | null {
    const doc = new DOMParser().parseFromString(html, 'text/html')

    const cell = doc.querySelector('#point-information tbody tr td')

    return cell?.textContent?.trim() ?? null
  }

  private handleWMSClick(layerId: string, data: string) {
    const stationId = this.extractStationId(data)

    if (!stationId) return

    switch (layerId) {
      case 'reportingpoints': {
        const reportingPointStore = useReportingPointStore()

        reportingPointStore.setReportingPoint({
          stationId: layerId,
          html: data,
        })

        router.replace({
          query: {
            ...router.currentRoute.value.query,
            reportingPoint: stationId,
          },
        })
        break
      }
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
            station: feature.properties?.codigo ? feature.properties.codigo : feature.id,
          },
        })
        break

      case 'subcuencas':
        router.replace({
          query: {
            ...router.currentRoute.value.query,
            subcuenca: feature.properties?.code,
          },
        })
        break

      case 'sistemas10':
        router.replace({
          query: {
            ...router.currentRoute.value.query,
            sistema: feature.properties?.sistema,
          },
        })
        break

      case 'zonasexpl':
        router.replace({
          query: {
            ...router.currentRoute.value.query,
            zona: feature.properties?.ogc_fid,
          },
        })
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
      if (config.type !== 'WMS') return

      const layersStore = useLayersStore()
      const layer = layersStore.layers[config.id]

      if (!layer) return
      if (layer.temporal) return

      const layerName = (config as WMSLayerConfig).layers
      const time = await getLayerTimeDimension(layerName)

      if (!time) return

      const startDate = config.start ? parseISO(config.start) : parseISO(time.start)
      const endDate = parseISO(time.end)

      const safeEnd = subHours(endDate, time.stepHours)

      // Si start está fuera (es mayor que end)
      const safeStart = isAfter(startDate, endDate)
        ? subHours(endDate, 10 * time.stepHours)
        : startDate

      layer.temporal = {
        start: safeStart.toISOString(),
        end: safeEnd.toISOString(),
        stepHours: time.stepHours,
      }

      layer.params = {
        ...layer.params,
        time: safeStart.toISOString(),
      }
    } catch (err) {
      console.error('Error loading temporal dimension', err)
    }
  }
}
