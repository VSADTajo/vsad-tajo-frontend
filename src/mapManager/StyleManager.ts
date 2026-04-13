import L from 'leaflet'
import { MAP_PANES } from '@/config/panes/mapPanes'
import type { LayerStyle } from '@/types/Layers'

export type LayerWithMap = L.Layer & {
  _map?: L.Map
}

export class StyleManager {
  private highlightLayer: L.GeoJSON | null = null
  private selectedLayer: L.GeoJSON | null = null
  private selectedFeatureId: string | null = null
  private layerId: string
  private style: LayerStyle | undefined
  private isSelectableLayer: boolean
  private onDblClick: ((feature: GeoJSON.Feature) => void) | null = null
  private lastClickTimestamp: number = 0
  private buildPopupContent: ((feature: GeoJSON.Feature) => string) | null = null

  constructor(
    layerId: string,
    style: LayerStyle | undefined,
    isSelectable: boolean,
    onDblClick?: (feature: GeoJSON.Feature) => void,
    buildPopupContent?: (feature: GeoJSON.Feature) => string
  ) {
    this.layerId = layerId
    this.style = style
    this.isSelectableLayer = isSelectable
    this.onDblClick = onDblClick || null
    this.buildPopupContent = buildPopupContent || null
    console.log(
      `[StyleManager] Inicializado para ${layerId}. Seleccionable: ${isSelectable}, Tiene estilo: ${!!style}, Tiene popup: ${!!buildPopupContent}`
    )
  }

  private listenersAttached: boolean = false

  /**
   * Attach all style listeners (hover, click) a un layer de GeoJSON
   */
  attachStyleListeners(geojsonLayer: L.GeoJSON, map: L.Map): void {
    // Evitar duplicar listeners si ya se adjuntaron
    if (this.listenersAttached) {
      console.log(`[StyleManager] Listeners ya adjuntados para ${this.layerId}, ignorando`)
      return
    }
    this.listenersAttached = true

    console.log(`[StyleManager] Adjuntando listeners a ${this.layerId}`)
    console.log(
      `[StyleManager] → isSelectableLayer: ${this.isSelectableLayer}, hasCallback: ${!!this.onDblClick}`
    )

    geojsonLayer.eachLayer((layer: L.Layer) => {
      const isPath = layer instanceof L.Path
      const isMarker = layer instanceof L.Marker

      if (!isPath && !isMarker) return

      const feature = (layer as (L.Path | L.Marker) & { feature?: GeoJSON.Feature }).feature as
        | GeoJSON.Feature
        | undefined
      if (!feature) return

      const featureId = this.getFeatureId(feature)
      console.log(
        `[StyleManager] → Procesando feature: ${featureId} (selectable: ${this.isSelectableLayer}, isMarker: ${isMarker})`
      )

      // Mouseover: mostrar highlight (solo para Path, markers ya tienen hover en geoserver.ts)
      if (isPath) {
        // Bind popup una sola vez durante setup (no en cada mouseover)
        if (this.buildPopupContent) {
          const popupContent = this.buildPopupContent(feature)
          layer.bindPopup(popupContent, {
            closeButton: false,
            autoClose: false,
            closeOnClick: false,
            className: 'feature-hover-popup',
            offset: L.point(0, 10),
          })
        }

        layer.on('mouseover', () => {
          console.log(
            `[StyleManager] MOUSEOVER en ${featureId}. Selected: ${this.selectedFeatureId}`
          )

          // Si quedó selectedFeatureId sin selectedLayer en mapa, resetear estado huérfano
          if (
            this.selectedFeatureId &&
            (!this.selectedLayer || !map.hasLayer(this.selectedLayer))
          ) {
            this.selectedFeatureId = null
            this.selectedLayer = null
          }

          // No mostrar highlight si es la feature seleccionada y sigue seleccionada en mapa
          if (
            featureId === this.selectedFeatureId &&
            this.selectedLayer &&
            map.hasLayer(this.selectedLayer)
          ) {
            console.log(`[StyleManager]   → Es la seleccionada, no hacer highlight`)
            return
          }

          this.clearHighlight()

          if (!this.style?.highlight) {
            console.log(`[StyleManager]   → Sin estilo highlight`)
            return
          }

          this.highlightLayer = L.geoJSON(feature as GeoJSON.GeoJsonObject, {
            style: this.style.highlight,
            pane: MAP_PANES.HIGHLIGHT,
            interactive: false,
          })

          this.highlightLayer.addTo(map)
          console.log(`[StyleManager]   → Highlight agregado`)

          // Abrir popup si está vinculado
          if (layer instanceof L.Path && layer.getPopup()) {
            layer.openPopup()
          }
        })

        // Mouseout: limpiar highlight y cerrar popup
        layer.on('mouseout', () => {
          console.log(`[StyleManager] MOUSEOUT en ${featureId}`)
          this.clearHighlight()

          // Cerrar popup si está abierto
          if (layer instanceof L.Path && layer.getPopup()) {
            layer.closePopup()
          }
        })
      }
      // Click: seleccionar feature (o navegar si no es seleccionable)
      layer.on('click', (e: L.LeafletMouseEvent) => {
        console.log(
          `[StyleManager] ✓ CLICK en ${featureId} (${this.layerId}). Seleccionable: ${this.isSelectableLayer}`
        )
        if (e.originalEvent) {
          e.originalEvent.preventDefault()
        }
        this.lastClickTimestamp = Date.now()
        console.log(`[StyleManager]   → lastClickTimestamp=${this.lastClickTimestamp}`)

        if (!this.isSelectableLayer) {
          // Para capas no seleccionables (SAIH): click directo = navegar
          console.log(
            `[StyleManager]   → SAIH (no seleccionable): disparando callback. Tiene callback: ${!!this.onDblClick}`
          )
          if (this.onDblClick) {
            console.log(`[StyleManager]   → Llamando onDblClick`)
            this.onDblClick(feature)
          } else {
            console.log(`[StyleManager]   ⚠️ Sin callback!`)
          }
          return
        }

        // Para capas seleccionables: click = seleccionar visualmente
        console.log(`[StyleManager]   → Seleccionable: seleccionando feature`)
        this.selectFeature(feature, featureId, map)
      })

      // Dblclick: navegar a ruta (solo en capas seleccionables)
      if (this.isSelectableLayer && isPath) {
        layer.on('dblclick', (e: L.LeafletMouseEvent) => {
          console.log(`[StyleManager] DBLCLICK en ${featureId}`)
          L.DomEvent.stop(e)

          if (this.onDblClick) {
            console.log(`[StyleManager]   → Disparando navegación`)
            this.onDblClick(feature)
          }
        })
      }
    })
  }

  /**
   * Selecciona una feature y aplica estilo
   */
  private selectFeature(feature: GeoJSON.Feature, featureId: string, map: L.Map): void {
    console.log(`[StyleManager] SELECCIONANDO ${featureId}`)

    // Si quedó estado huérfano por una limpieza externa, reiniciarlo antes de seleccionar
    if (!this.selectedLayer && this.selectedFeatureId) {
      this.selectedFeatureId = null
    }

    // Limpiar selección anterior
    this.clearSelection()

    // Crear nueva selección
    this.selectedLayer = L.geoJSON(feature as GeoJSON.GeoJsonObject, {
      style: this.style?.selected || this.style?.highlight,
      pane: MAP_PANES.HIGHLIGHT,
      interactive: false,
    })

    this.selectedLayer.addTo(map)
    this.selectedFeatureId = featureId
    console.log(`[StyleManager]   → Seleccionada. FlyTo zoom 10`)

    // FlyTo
    const bounds = this.selectedLayer.getBounds()
    if (bounds && bounds.isValid()) {
      map.flyTo(bounds.getCenter(), 10, { animate: true, duration: 0.8 })
    }
  }

  /**
   * Limpia el highlight (hover)
   */
  private clearHighlight(): void {
    if (this.highlightLayer) {
      this.highlightLayer.remove()
      this.highlightLayer = null
      console.log(`[StyleManager]   → Highlight removido`)
    }
  }

  /**
   * Limpia la selección
   */
  private clearSelection(): void {
    if (this.selectedLayer) {
      this.selectedLayer.remove()
      this.selectedLayer = null
      console.log(`[StyleManager]   → Selección removida`)
    }

    // Resetear siempre el ID seleccionado aunque no exista layer referenciado
    this.selectedFeatureId = null
  }

  /**
   * Obtiene ID único de una feature
   */
  private getFeatureId(feature: GeoJSON.Feature): string {
    const props = feature.properties ?? {}
    const id =
      props['code'] ||
      props['codigo'] ||
      props['sistema'] ||
      props['ogc_fid'] ||
      props['id'] ||
      feature.id

    return String(id || 'unknown')
  }

  /**
   * Obtiene ID de la feature seleccionada
   */
  getSelectedFeatureId(): string | null {
    return this.selectedFeatureId
  }

  /**
   * Verifica si el último click fue manejado por este StyleManager (dentro de los últimos 100ms)
   */
  wasLastClickHandled(): boolean {
    return Date.now() - this.lastClickTimestamp < 100
  }
}
