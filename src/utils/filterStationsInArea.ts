import booleanPointInPolygon from '@turf/boolean-point-in-polygon'

// Same point-in-polygon check LayerInteractionManager.ts already uses for
// map clicks — here it's used to emulate, on the client, what the live
// `getStationsByAreaService` endpoint does server-side (return only the
// stations that fall inside a sistema/subcuenca/zona's boundary), since a
// locally loaded stations file has no area membership of its own to filter
// by, only coordinates.
export function filterStationsInsideFeature<
  T extends { latitude: number | null; longitude: number | null },
>(stations: T[], feature: GeoJSON.Feature | null): T[] {
  if (!feature) return []

  const { geometry } = feature
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return []

  const polygonFeature = feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>

  return stations.filter((station) => {
    if (station.latitude == null || station.longitude == null) return false
    if (!Number.isFinite(station.latitude) || !Number.isFinite(station.longitude)) return false

    const point: GeoJSON.Point = {
      type: 'Point',
      coordinates: [station.longitude, station.latitude],
    }

    return booleanPointInPolygon(point, polygonFeature)
  })
}
