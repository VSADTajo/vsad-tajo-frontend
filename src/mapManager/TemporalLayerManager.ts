import L from 'leaflet'
import { subHours, isAfter, parseISO } from 'date-fns'
import { createLayer } from '@/services/geoserver'
import { useLayersStore } from '@/stores/layersStore'
import { getLayerTimeDimension } from '@/services/efasWmsService'
import { getGeoServerLayerTimeDimension } from '@/services/geoserverWmsService'
import { efas_url } from '@/config/efasConfig'
import type { LayerConfig, LayerState, WMSLayerConfig } from '@/types/Layers'

type LayerById = Record<string, L.Layer>
type TemporalLayerById = Record<string, L.TileLayer.WMS[]>
type GenerationById = Record<string, number>

export class TemporalLayerManager {
  private map: L.Map
  private configMap: Map<string, LayerConfig>
  private activeLayers: LayerById
  private temporalLayers: TemporalLayerById
  private layerGeneration: GenerationById

  constructor(
    map: L.Map,
    configMap: Map<string, LayerConfig>,
    activeLayers: LayerById,
    temporalLayers: TemporalLayerById,
    layerGeneration: GenerationById
  ) {
    this.map = map
    this.configMap = configMap
    this.activeLayers = activeLayers
    this.temporalLayers = temporalLayers
    this.layerGeneration = layerGeneration
  }

  invalidateLayerGeneration(layerId: string): void {
    this.layerGeneration[layerId] = (this.layerGeneration[layerId] ?? 0) + 1
  }

  removeTemporalLayers(layerId: string): void {
    const temporalList = this.temporalLayers[layerId]

    if (!temporalList?.length) {
      return
    }

    for (const layer of temporalList) {
      this.map.removeLayer(layer)
    }

    delete this.temporalLayers[layerId]
  }

  async updateTimeState(layerState: LayerState): Promise<void> {
    if (!layerState.visible) {
      return
    }

    const current = this.activeLayers[layerState.id]

    if (!(current instanceof L.TileLayer.WMS)) {
      return
    }

    const newTime = layerState.params?.time

    if (!newTime) {
      return
    }

    const currentTime = (current.wmsParams as unknown as Record<string, unknown>)?.time

    if (currentTime === newTime) {
      return
    }

    const config = this.configMap.get(layerState.id)
    if (!config) {
      return
    }

    const createdLayer = await createLayer(config, { time: newTime })

    if (!(createdLayer instanceof L.TileLayer.WMS)) {
      return
    }

    const newLayer = createdLayer

    newLayer.setOpacity(0)
    newLayer.addTo(this.map)

    if (!this.temporalLayers[layerState.id]) {
      this.temporalLayers[layerState.id] = []
    }

    const temporalList = this.temporalLayers[layerState.id]
    temporalList.push(newLayer)

    // Mantener solo la capa actual y una anterior para transicion.
    if (temporalList.length > 2) {
      const old = temporalList.shift()
      if (old) {
        this.map.removeLayer(old)
      }
    }

    const generation = this.nextGeneration(layerState.id)

    newLayer.once('load', () => {
      if (this.layerGeneration[layerState.id] !== generation) {
        this.map.removeLayer(newLayer)
        return
      }

      if (!layerState.visible) {
        this.map.removeLayer(newLayer)
        return
      }

      this.fadeLayer(newLayer, 1)
      this.fadeLayer(current, 0, () => {
        this.map.removeLayer(current)
      })

      this.activeLayers[layerState.id] = newLayer
    })
  }

  async loadTemporalDimension(config: LayerConfig): Promise<void> {
    if (config.type !== 'WMS') {
      return
    }

    const layersStore = useLayersStore()
    const layer = layersStore.layers[config.id]

    if (!layer) {
      return
    }

    if (layer.temporal) {
      return
    }

    try {
      const wmsConfig = config as WMSLayerConfig

      const timeDimension =
        wmsConfig.url === efas_url
          ? await getLayerTimeDimension(wmsConfig.layers)
          : await getGeoServerLayerTimeDimension({
              url: wmsConfig.url,
              layerName: wmsConfig.layers,
            })

      if (!timeDimension) {
        return
      }

      const startDate = config.start ? parseISO(config.start) : parseISO(timeDimension.start)
      const endDate = parseISO(timeDimension.end)
      const safeEnd = subHours(endDate, timeDimension.stepHours)

      const safeStart = isAfter(startDate, endDate)
        ? subHours(endDate, 10 * timeDimension.stepHours)
        : startDate

      layer.temporal = {
        start: safeStart.toISOString(),
        end: safeEnd.toISOString(),
        stepHours: timeDimension.stepHours,
      }

      layer.params = {
        ...layer.params,
        time: safeStart.toISOString(),
      }
    } catch (err) {
      console.error('Error loading temporal dimension', err)
    }
  }

  private nextGeneration(layerId: string): number {
    const nextValue = (this.layerGeneration[layerId] ?? 0) + 1
    this.layerGeneration[layerId] = nextValue
    return nextValue
  }

  private fadeLayer(layer: L.TileLayer, targetOpacity: number, onEnd?: () => void): void {
    let opacity = layer.options.opacity ?? 1
    const step = targetOpacity > opacity ? 0.1 : -0.1

    const interval = setInterval(() => {
      opacity += step

      if ((step > 0 && opacity >= targetOpacity) || (step < 0 && opacity <= targetOpacity)) {
        layer.setOpacity(targetOpacity)
        clearInterval(interval)
        onEnd?.()
        return
      }

      layer.setOpacity(Math.max(0, Math.min(1, opacity)))
    }, 50)
  }
}
