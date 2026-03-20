type BoundaryData = {
  geojson: GeoJSON.FeatureCollection
  bbox: [[number, number], [number, number]]
}

export const boundaryStore: Record<string, BoundaryData> = {}
