import type { LocalFileStation } from '@/types/LocalStationsFile'
import type {
  DataStationPrediction,
  PredictionResult,
  StationPrediction,
} from '@/types/Predictions'
import { baseStationCode, stationTypeFromCode } from '@/utils/localStationCode'

// The observed-data export is a flat text file, not real CSV: it repeats
// "Clave:\tValor" metadata lines for one station+parámetro block, followed by
// its "dd/mm/yyyy;HH:mm:ss;valor" data rows, then the next block starts right
// away with the same metadata keys again (no blank line in between).
interface ObservedBlock {
  header: Record<string, string>
  rows: { date: string; time: string; value: string }[]
}

const BLOCK_START_KEY = 'Ubicación de la estación:'
const STATION_CODE_KEY = 'Número de la estación:'
const STATION_NAME_KEY = 'Nombre de la estación:'
const PARAMETER_TYPE_KEY = 'Tipo de parámetro:'
const SERIES_NAME_KEY = 'Nombre de la serie temporal:'
const LONGITUDE_KEY = 'Longitud:'
const LATITUDE_KEY = 'Latitud:'

const DATA_ROW_PATTERN = /^(\d{2}\/\d{2}\/\d{4});(\d{2}:\d{2}:\d{2});(.+)$/
// Normally a literal tab, but some exports pad the key with spaces instead.
const KEY_VALUE_SEPARATOR = /\t| {2,}/

function parseBlocks(text: string): ObservedBlock[] {
  const blocks: ObservedBlock[] = []
  let current: ObservedBlock | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const dataMatch = DATA_ROW_PATTERN.exec(line)
    if (dataMatch) {
      current?.rows.push({ date: dataMatch[1], time: dataMatch[2], value: dataMatch[3] })
      continue
    }

    const sepMatch = KEY_VALUE_SEPARATOR.exec(line)
    if (!sepMatch) continue

    const key = line.slice(0, sepMatch.index).trim()
    const value = line.slice(sepMatch.index + sepMatch[0].length).trim()

    if (key === BLOCK_START_KEY) {
      if (current) blocks.push(current)
      current = { header: {}, rows: [] }
    }

    if (!current) continue
    current.header[key] = value
  }

  if (current) blocks.push(current)

  return blocks
}

function toIsoDate(date: string, time: string): string {
  const [day, month, year] = date.split('/')
  return `${year}-${month}-${day}T${time}`
}

function toPredictionResults(rows: ObservedBlock['rows']): PredictionResult[] {
  const results: PredictionResult[] = []

  rows.forEach((row, index) => {
    const value = Number.parseFloat(row.value.replace(',', '.'))
    if (!Number.isFinite(value)) return

    results.push({ id: index, date: toIsoDate(row.date, row.time), value, flag: 0 })
  })

  return results
}

function blockToStation(block: ObservedBlock): LocalFileStation | null {
  const rawCode = block.header[STATION_CODE_KEY]
  if (!rawCode) return null

  const stationCode = baseStationCode(rawCode)
  const parameterType = (block.header[PARAMETER_TYPE_KEY] ?? '').trim().toUpperCase()
  const isPrecipitation = parameterType.startsWith('PRECIP')
  const isVolumen = !isPrecipitation && parameterType.startsWith('VOL')

  const latitude = Number.parseFloat(block.header[LATITUDE_KEY] ?? '')
  const longitude = Number.parseFloat(block.header[LONGITUDE_KEY] ?? '')
  const tipoCod = stationTypeFromCode(stationCode)
  const stationName = block.header[STATION_NAME_KEY] ?? stationCode

  const historical: StationPrediction = {
    id: `${stationCode}-${block.header[SERIES_NAME_KEY] ?? 'historical'}`,
    stationId: stationCode,
    stationName,
    predictionTypeName: block.header[SERIES_NAME_KEY] ?? '',
    simulationDate: '',
    predictionDate: '',
    predictionProvider: '',
    predictedBy: '',
    results: toPredictionResults(block.rows),
  }

  const predictions: DataStationPrediction = { historical }

  return {
    id: stationCode,
    name: stationName,
    stationCode,
    stationType: tipoCod,
    tipoCod,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    predictionsCaudal: !isPrecipitation && !isVolumen ? predictions : undefined,
    predictionsVolumen: isVolumen ? predictions : undefined,
    predictionsPrecipitacion: isPrecipitation ? predictions : undefined,
  }
}

export function isObservedCsvFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.csv')
}

// Each block becomes its own LocalFileStation (one variable each); a station
// with both a caudal and a precip block ends up as two entries here, and
// localFileStore's mergeStationsByCode() combines them by stationCode same
// as it does across separate files.
export function parseObservedCsvFile(text: string): LocalFileStation[] {
  return parseBlocks(text)
    .map(blockToStation)
    .filter((station): station is LocalFileStation => station !== null)
}
