import L from 'leaflet'

export class LegendManager {
  private map: L.Map
  private legends: Record<string, L.Control> = {}

  constructor(map: L.Map) {
    this.map = map
  }

  addLegend(layerId: string, url: string) {
    if (this.legends[layerId]) return

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

  removeLegend(layerId: string) {
    const legend = this.legends[layerId]

    if (!legend) return

    legend.remove()

    delete this.legends[layerId]
  }
}
