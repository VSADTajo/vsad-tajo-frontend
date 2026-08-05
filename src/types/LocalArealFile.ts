import type { DataStationPrediction } from '@/types/Predictions'

// A sistema/subcuenca/zona-meteoalerta area (identified by the same
// locationId the live API expects, e.g. "Sistema.Tajo.1", "Cuenca.AEMET.17")
// with the areal precipitation series loaded from a local file.
export interface LocalArealArea {
  id: string
  name: string
  predictions: DataStationPrediction
}
