import L from 'leaflet'

type GradientLegendOptions = {
  title: string
  legendUrl: string
  units?: string
}

export class LegendManager {
  private map: L.Map
  private legends: Record<string, L.Control> = {}

  constructor(map: L.Map) {
    this.map = map
  }

  addLegend(layerId: string, url: string) {
    if (this.legends[layerId]) {
      console.debug('[LegendManager] Leyenda ya existente, se omite addLegend', { layerId })
      return
    }

    console.debug('[LegendManager] addLegend (imagen nativa)', {
      layerId,
      url,
    })

    const legend = new L.Control({ position: 'bottomright' })

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-control custom-legend')

      const img = document.createElement('img')
      img.src = url

      div.appendChild(img)

      return div
    }

    legend.addTo(this.map)

    this.legends[layerId] = legend
  }

  async addGradientLegend(layerId: string, options: GradientLegendOptions) {
    if (this.legends[layerId]) {
      console.debug('[LegendManager] Leyenda ya existente, se omite addGradientLegend', {
        layerId,
      })
      return
    }

    console.debug('[LegendManager] addGradientLegend iniciado', {
      layerId,
      title: options.title,
      legendUrl: options.legendUrl,
    })

    console.debug('[LegendManager] Render de leyenda con imagen titulada', { layerId })

    const legend = new L.Control({ position: 'bottomright' })

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-control custom-legend custom-legend-gradient')
      const unitsText = options.units ? ` (${options.units})` : ''

      div.innerHTML = `
        <div class="custom-legend-title">${options.title}${unitsText}</div>
        <img class="custom-legend-image" src="${options.legendUrl}" alt="Leyenda ${options.title}" />
      `

      return div
    }

    legend.addTo(this.map)
    this.legends[layerId] = legend
  }

  removeLegend(layerId: string) {
    const legend = this.legends[layerId]

    if (!legend) return

    console.debug('[LegendManager] removeLegend', { layerId })

    legend.remove()

    delete this.legends[layerId]
  }
}
