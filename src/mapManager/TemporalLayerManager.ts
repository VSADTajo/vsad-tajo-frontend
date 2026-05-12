import L from 'leaflet'
import { subHours, isAfter, parseISO, addHours } from 'date-fns'
import { createLayer } from '@/services/geoserver'
import { useLayersStore } from '@/stores/layersStore'
import { getLayerTimeDimension } from '@/services/efasWmsService'
import { getGeoServerLayerTimeDimension } from '@/services/geoserverWmsService'
import { efas_url } from '@/config/efasConfig'
import type { LayerConfig, LayerState, WMSLayerConfig } from '@/types/Layers'
import { LayerInteractionManager } from './LayerInteractionManager'
import { isPrecipitacionLayerId } from './layerConstants'

type LayerById = Record<string, L.Layer>
type TemporalLayerById = Record<string, L.TileLayer.WMS[]>
type GenerationById = Record<string, number>
type TemporalWmsLayer = L.TileLayer.WMS & { __temporalReady?: boolean }
const DEBUG_TEMPORAL_WMS = true

export class TemporalLayerManager {
  private map: L.Map
  private configMap: Map<string, LayerConfig>
  private activeLayers: LayerById
  private temporalLayers: TemporalLayerById
  private layerGeneration: GenerationById
  private interactionManager: LayerInteractionManager
  private layersStore = useLayersStore()

  private debugLog(message: string, payload?: unknown): void {
    if (!DEBUG_TEMPORAL_WMS) return
    if (payload === undefined) {
      console.log(`[TemporalWMS] ${message}`)
      return
    }

    console.log(`[TemporalWMS] ${message}`, payload)
  }

  constructor(
    map: L.Map,
    configMap: Map<string, LayerConfig>,
    activeLayers: LayerById,
    temporalLayers: TemporalLayerById,
    layerGeneration: GenerationById,
    interactionManager: LayerInteractionManager
  ) {
    this.map = map
    this.configMap = configMap
    this.activeLayers = activeLayers
    this.temporalLayers = temporalLayers
    this.layerGeneration = layerGeneration
    this.interactionManager = interactionManager
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

    this.debugLog('updateTimeState candidate', {
      layerId: layerState.id,
      currentTime,
      newTime,
      visible: layerState.visible,
    })

    if (currentTime === newTime) {
      return
    }

    const loadState = this.layersStore.layers[layerState.id]?.temporalLoadState
    if (loadState?.loading && loadState.requestedTime === newTime) {
      this.debugLog('skip updateTimeState (already loading same time)', {
        layerId: layerState.id,
        requestedTime: loadState.requestedTime,
      })
      return
    }

    const config = this.configMap.get(layerState.id)
    if (!config) {
      return
    }

    this.layersStore.setTemporalLoadState(layerState.id, {
      requestedTime: newTime,
      loadedTime: undefined,
      loading: true,
    })

    this.debugLog('setTemporalLoadState loading=true', {
      layerId: layerState.id,
      requestedTime: newTime,
    })

    const createdLayer =
      this.findTemporalLayer(layerState.id, newTime) ??
      (await createLayer(config, { time: newTime }))

    if (!(createdLayer instanceof L.TileLayer.WMS)) {
      this.layersStore.setTemporalLoadState(layerState.id, {
        loading: false,
      })
      this.debugLog('createLayer failed or non-WMS', {
        layerId: layerState.id,
        requestedTime: newTime,
      })
      return
    }

    const newLayer = createdLayer as TemporalWmsLayer

    newLayer.setOpacity(0)
    if (!this.map.hasLayer(newLayer)) {
      newLayer.addTo(this.map)
    }

    this.registerTemporalLayer(layerState.id, newLayer)

    const generation = this.nextGeneration(layerState.id)

    const activateLayer = () => {
      if (this.layerGeneration[layerState.id] !== generation) {
        this.debugLog('skip activateLayer due generation mismatch', {
          layerId: layerState.id,
          generation,
          currentGeneration: this.layerGeneration[layerState.id],
          requestedTime: newTime,
        })
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
      this.interactionManager.detachWMSClick(layerState.id)
      this.interactionManager.attachWMSClick(layerState.id, newLayer)

      this.layersStore.setTemporalLoadState(layerState.id, {
        requestedTime: newTime,
        loadedTime: newTime,
        loading: false,
      })

      this.debugLog('activateLayer completed', {
        layerId: layerState.id,
        loadedTime: newTime,
      })

      if (isPrecipitacionLayerId(layerState.id)) {
        this.interactionManager.detachPrecipitacionClick(layerState.id)
        this.interactionManager.attachPrecipitacionClick(layerState.id, newLayer)
      }

      void this.prefetchNextTemporalLayer(layerState, config, newTime)
    }

    if (newLayer.__temporalReady) {
      activateLayer()
      return
    }

    newLayer.once('load', () => {
      newLayer.__temporalReady = true
      activateLayer()
    })
  }

  async loadTemporalDimension(config: LayerConfig): Promise<void> {
    if (config.type !== 'WMS') {
      return
    }

    const layer = this.layersStore.layers[config.id]

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

      const isRangeTemporal = config.temporalControlMode === 'range'
      const candidateEnd = addHours(safeStart, timeDimension.stepHours)
      const safeRangeEnd = isAfter(candidateEnd, safeEnd) ? safeEnd : candidateEnd

      layer.temporal = {
        start: safeStart.toISOString(),
        end: safeEnd.toISOString(),
        stepHours: timeDimension.stepHours,
      }

      layer.params = {
        ...layer.params,
        time: isRangeTemporal
          ? `${safeStart.toISOString()}/${safeRangeEnd.toISOString()}`
          : safeStart.toISOString(),
      }

      layer.temporalLoadState = {
        requestedTime: layer.params.time,
        loadedTime: undefined,
        loading: false,
      }

      this.debugLog('loadTemporalDimension initialized', {
        layerId: config.id,
        timeDimension,
        safeStartIso: safeStart.toISOString(),
        safeEndIso: safeEnd.toISOString(),
        initialParamTime: layer.params.time,
      })
    } catch (err) {
      console.error('Error loading temporal dimension', err)
    }
  }

  private nextGeneration(layerId: string): number {
    const nextValue = (this.layerGeneration[layerId] ?? 0) + 1
    this.layerGeneration[layerId] = nextValue
    return nextValue
  }

  private findTemporalLayer(layerId: string, time: string): L.TileLayer.WMS | undefined {
    const temporalList = this.temporalLayers[layerId]

    return temporalList?.find((layer) => {
      const currentTime = (layer.wmsParams as unknown as Record<string, unknown>)?.time
      return currentTime === time
    })
  }

  private registerTemporalLayer(layerId: string, layer: TemporalWmsLayer): void {
    if (!this.temporalLayers[layerId]) {
      this.temporalLayers[layerId] = []
    }

    const temporalList = this.temporalLayers[layerId]
    const activeLayer = this.activeLayers[layerId]

    if (!temporalList.includes(layer)) {
      temporalList.push(layer)
    }

    // Mantener solo 2 capas temporales sin expulsar la capa visible actual.
    while (temporalList.length > 2) {
      let removableIndex = temporalList.findIndex(
        (candidate) => candidate !== activeLayer && candidate !== layer
      )

      if (removableIndex === -1) {
        removableIndex = temporalList.findIndex((candidate) => candidate !== activeLayer)
      }

      if (removableIndex === -1) {
        this.debugLog('skip temporal eviction to avoid removing active layer', {
          layerId,
          temporalCount: temporalList.length,
        })
        break
      }

      const [removable] = temporalList.splice(removableIndex, 1)
      if (removable) {
        const activeTime = activeLayer
          ? ((activeLayer as L.TileLayer.WMS).wmsParams as unknown as Record<string, unknown>)?.time
          : undefined
        const evictedTime = (
          (removable as L.TileLayer.WMS).wmsParams as unknown as Record<string, unknown>
        )?.time

        this.debugLog('evict temporal cached layer', {
          layerId,
          activeTime,
          evictedTime,
        })
        this.map.removeLayer(removable)
      }
    }
  }

  private async prefetchNextTemporalLayer(
    layerState: LayerState,
    config: LayerConfig,
    currentTime: string
  ): Promise<void> {
    if (config.temporalControlMode === 'range') {
      return
    }

    if (!layerState.temporal || currentTime.includes('/')) {
      return
    }

    const currentDate = parseISO(currentTime)
    const nextDate = addHours(currentDate, layerState.temporal.stepHours)
    const endDate = parseISO(layerState.temporal.end)

    if (isAfter(nextDate, endDate)) {
      return
    }

    const nextTime = nextDate.toISOString()

    this.debugLog('prefetch next temporal layer', {
      layerId: layerState.id,
      fromTime: currentTime,
      nextTime,
    })

    if (this.findTemporalLayer(layerState.id, nextTime)) {
      return
    }

    const prefetchedLayer = await createLayer(config, { time: nextTime })

    if (!(prefetchedLayer instanceof L.TileLayer.WMS)) {
      return
    }

    const temporalLayer = prefetchedLayer as TemporalWmsLayer
    temporalLayer.__temporalReady = false
    temporalLayer.setOpacity(0)
    temporalLayer.addTo(this.map)

    this.registerTemporalLayer(layerState.id, temporalLayer)

    temporalLayer.once('load', () => {
      temporalLayer.__temporalReady = true
    })
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
