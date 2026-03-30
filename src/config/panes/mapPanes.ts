import L from 'leaflet'

export const MAP_PANES = {
  BASEMAP: 'basemapPane',
  BASELAYER: 'baselayerPane',
  POLYGONS: 'polygonsPane',
  CONTORNO: 'contornoPane',
  LINES: 'linesPane',
  POINTS: 'pointsPane',
  REPORTING: 'reportingPane',
  HIGHLIGHT: 'highlightPane',
} as const

export function createMapPanes(map: L.Map) {
  const panes = [
    { name: MAP_PANES.BASEMAP, zIndex: 100 },
    { name: MAP_PANES.BASELAYER, zIndex: 200 },
    { name: MAP_PANES.POLYGONS, zIndex: 300 },
    { name: MAP_PANES.CONTORNO, zIndex: 300 },
    { name: MAP_PANES.LINES, zIndex: 400 },
    { name: MAP_PANES.POINTS, zIndex: 500 },
    { name: MAP_PANES.REPORTING, zIndex: 600 },
    { name: MAP_PANES.HIGHLIGHT, zIndex: 700 },
  ]

  panes.forEach(({ name, zIndex }) => {
    map.createPane(name)

    const pane = map.getPane(name)
    if (pane) {
      pane.style.zIndex = String(zIndex)
    }
  })
}
