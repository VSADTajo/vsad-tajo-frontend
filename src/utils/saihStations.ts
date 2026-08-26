import { getSaihAlertInfo, getSaihPrecipMaxInfo } from '@/utils/saihAlerts'
import { useMapDataSourceStore } from '@/stores/mapDataSourceStore'
import { useMapModelStore } from '@/stores/mapModelStore'
import { useSimulationsStore } from '@/stores/simulationsStore'
import type { SimulationResultPrediction } from '@/types/Simulations'
import { formatPopupDate } from './dates'

export const SAIH_TYPE_COLORS: Record<string, string> = {
  AR: '#4775a8',
  E: '#101c44',
  I: '#183824',
  P: '#666a6b',
  MC: '#09351a',
  NV: '#acadaf',
  PN: '#7d807f',
  AC: '#4f5faf',
}

export function getSaihTypeColor(tipo: string | undefined | null): string {
  const key = String(tipo ?? '').toUpperCase()
  return SAIH_TYPE_COLORS[key] ?? '#6c757d'
}

function escapeHtml(value: unknown): string {
  return String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  const num = Number.parseInt(full, 16)

  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function darkenHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex)
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

  return `rgb(${clamp(r * factor)}, ${clamp(g * factor)}, ${clamp(b * factor)})`
}

function readNumericValue(props: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = props[key]
    if (raw == null) continue

    if (typeof raw === 'number' && Number.isFinite(raw)) return raw

    if (typeof raw === 'string') {
      const normalized = raw.replace(',', '.').trim()
      const parsed = Number.parseFloat(normalized)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return null
}

function buildAlertChip(
  value: number | null,
  props: Record<string, unknown>,
  backgroundColor?: string | null
): string {
  if (value == null) {
    return '<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#e5e7eb;color:#374151;font-weight:700">--</span>'
  }

  const yellowThreshold = readNumericValue(props, ['umbral_amarillo', 'threshold_yellow']) ?? 40
  const orangeThreshold = readNumericValue(props, ['umbral_naranja', 'threshold_orange']) ?? 70
  const redThreshold = readNumericValue(props, ['umbral_rojo', 'threshold_red']) ?? 90

  const formatValue = value.toFixed(2)

  if (backgroundColor === '#fca5a5') {
    return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#fca5a5;color:#fff;font-weight:700">${formatValue} m3/s</span>`
  }

  if (backgroundColor === '#fdba74') {
    return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#fdba74;color:#fff;font-weight:700">${formatValue} m3/s</span>`
  }

  if (backgroundColor === '#fde68a') {
    return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#fde68a;color:#1f2937;font-weight:700">${formatValue} m3/s</span>`
  }

  if (value >= redThreshold) {
    return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#fca5a5;color:#fff;font-weight:700">${formatValue} m3/s</span>`
  }

  if (value >= orangeThreshold) {
    return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#fdba74;color:#fff;font-weight:700">${formatValue} m3/s</span>`
  }

  if (value >= yellowThreshold) {
    return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#fde68a;color:#1f2937;font-weight:700">${formatValue} m3/s</span>`
  }

  return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#e5e7eb;color:#374151;font-weight:700">${formatValue} m3/s</span>`
}

function buildSimulationPredictionsSection(stationCode: string): string {
  const results = useSimulationsStore().simulationResults
  if (!results) return ''

  // Only the EPS median (P50) and the deterministic Harmonie run — not all
  // 6 percentiles the API returns per station.
  const stationPredictions = results.predictions.filter((prediction) => {
    const code = String(prediction.station?.stationCode ?? prediction.stationId ?? '')
    if (code.toUpperCase() !== stationCode.toUpperCase()) return false

    if (prediction.predictionTypeName.endsWith('.harmonie')) return true
    return prediction.predictionTypeName.endsWith('.eps') && prediction.percentile === 50
  })

  if (!stationPredictions.length) return ''

  const sorted = [...stationPredictions].sort((a, b) => {
    const nameCompare = a.predictionTypeName.localeCompare(b.predictionTypeName)
    if (nameCompare !== 0) return nameCompare
    return (a.percentile ?? -1) - (b.percentile ?? -1)
  })

  const rows = sorted
    .map((prediction: SimulationResultPrediction) => {
      const label = prediction.predictionTypeName.endsWith('.harmonie')
        ? 'Volumenes Harmonie'
        : 'Volumenes EPS Medio'
      const unit = escapeHtml(prediction.predictionTypeUnit ?? '')
      const maxValue = escapeHtml(
        prediction.max?.value != null ? `${prediction.max.value.toFixed(2)} ${unit}` : '-'
      )
      const maxDate = escapeHtml(formatPopupDate(prediction.max?.date))
      const lastValue = escapeHtml(
        prediction.last?.value != null ? `${prediction.last.value.toFixed(2)} ${unit}` : '-'
      )
      const lastDate = escapeHtml(formatPopupDate(prediction.last?.date))

      return `
        <div style="margin-top:6px;padding-top:6px;border-top:1px solid #e5e7eb">
          <div style="font-weight:700;margin-bottom:2px">${label}</div>
          <div>Máx: ${maxValue} <span style="color:#6b7280">(${maxDate})</span></div>
          <div>Últ: ${lastValue} <span style="color:#6b7280">(${lastDate})</span></div>
        </div>
      `
    })
    .join('')

  return rows
}

export function buildSaihMinimalPopupContent(feature: GeoJSON.Feature): string {
  const props = (feature.properties ?? {}) as Record<string, unknown>
  const tipo = String(props.tipoCod ?? props.tipo_cod ?? props.tipo ?? '')
  const headerColor = getSaihTypeColor(tipo)
  const headerColorDark = darkenHex(headerColor, 0.72)
  const codigo = escapeHtml(props.stationCode ?? props.codigo ?? '')
  const nombre = escapeHtml(props.name ?? props.nombre ?? '')
  const municipio = escapeHtml(props.municipio ?? '-')

  const simulationSection = buildSimulationPredictionsSection(
    String(props.stationCode ?? props.codigo ?? '')
  )

  return `
    <div style="min-width:180px;border-radius:12px;overflow:hidden;font-family:Montserrat,sans-serif;box-shadow:0 8px 20px rgba(0,0,0,0.16)">
      <div style="padding:10px 12px;background:linear-gradient(135deg, ${headerColor} 0%, ${headerColorDark} 100%);color:#fff">
        <div style="font-size:15px;font-weight:700;line-height:1.2">${codigo}</div>
        <div style="font-size:12px;opacity:.92;margin-top:2px;line-height:1.2">${nombre}</div>
      </div>
      <div style="padding:10px 12px;background:#fff;color:#1f2937;font-size:12px;line-height:1.5">
        <div><strong>Municipio:</strong> ${municipio}</div>
        ${simulationSection}
      </div>
    </div>
  `
}

export function buildSaihPopupContent(feature: GeoJSON.Feature): string {
  const props = (feature.properties ?? {}) as Record<string, unknown>

  const tipo = String(props.tipoCod ?? props.tipo_cod ?? props.tipo ?? '')
  const headerColor = getSaihTypeColor(tipo)
  const headerColorDark = darkenHex(headerColor, 0.72)
  const alertInfo = getSaihAlertInfo(feature)
  const precipInfo = getSaihPrecipMaxInfo(feature)

  const codigo = escapeHtml(props.stationCode ?? props.codigo ?? '')
  const nombre = escapeHtml(props.name ?? props.nombre ?? '')
  const municipio = escapeHtml(props.municipio ?? '-')

  const dataSource = useMapDataSourceStore().selectedDataSource
  const isObservado = dataSource === 'observado'

  // The top toggle picks one of three mutually exclusive views: Caudal NAM,
  // Caudal MIKE, or Precipitaciones. The popup only ever shows the section
  // matching the active one — never both, and never silently falling back
  // to the other when the active one has no data for this station.
  const isPrecipView = useMapModelStore().selectedModel === 'precipitacion'

  const noDataStyle = 'margin-bottom:6px;color:#6b7280'

  // A pure precipitation station (tipo P) has no caudal entry, so
  // alertInfo.simulationDate is null — the fields only ever come from the
  // view currently being shown. Observado carries its own simulationDate
  // too (same response shape as every other source), so it's shown here
  // regardless of which data source is active.
  const simulationDate = isPrecipView ? precipInfo.simulationDate : alertInfo.simulationDate

  const simulationDateSection = simulationDate
    ? `<div style="margin-bottom:6px"><strong>Fecha de Simulación</strong> ${escapeHtml(formatPopupDate(simulationDate))}</div>`
    : ''

  // Latest is the most recent single reading (as opposed to maxValue, the
  // peak over the whole forecast horizon) — colored against its own
  // thresholds, not the max's classification (no backgroundColor override).
  const latestValueChip = buildAlertChip(alertInfo.latestValue, props)
  const latestTime = escapeHtml(formatPopupDate(alertInfo.latestDate))
  const latestLabel = isObservado ? 'Último Caudal Observado' : 'Último Caudal Previsto'
  const latestDateLabel = isObservado ? 'Fecha Observada' : 'Fecha Prevista'

  const latestSection =
    isPrecipView || alertInfo.latestValue == null
      ? ''
      : `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
          <strong>${latestLabel}</strong>
          ${latestValueChip}
        </div>
        <div style="margin-bottom:6px"><strong>${latestDateLabel}</strong> ${latestTime}</div>`

  const maxValueChip = buildAlertChip(alertInfo.maxValue, props, alertInfo.backgroundColor)
  const maxTime = escapeHtml(formatPopupDate(alertInfo.maxDate))
  const caudalLabel = isObservado ? 'Caudal Max Observado' : 'Caudal Máximo Previsto'
  const caudalDateLabel = isObservado ? 'Fecha Observada' : 'Fecha Prevista'

  const caudalSection = isPrecipView
    ? ''
    : alertInfo.maxValue != null
      ? `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
          <strong>${caudalLabel}</strong>
          ${maxValueChip}
        </div>
        <div style="margin-bottom:6px"><strong>${caudalDateLabel}</strong> ${maxTime}</div>`
      : `<div style="${noDataStyle}">No hay datos de caudal.</div>`

  const precipValue = precipInfo.maxValue != null ? precipInfo.maxValue.toFixed(1) + ' mm' : '-'
  const precipTime = escapeHtml(formatPopupDate(precipInfo.maxDate))
  const precipLabel = isObservado ? 'Precipitacion Max observada' : 'Precipitación Máx. Prevista'
  const precipDateLabel = isObservado ? 'Fecha Observada' : 'Fecha Prevista'

  const precipSection = !isPrecipView
    ? ''
    : precipInfo.maxValue != null
      ? `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
          <strong>${precipLabel}</strong>
          <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#bfdbfe;color:#1e3a5f;font-weight:700">${precipValue}</span>
        </div>
        <div style="margin-bottom:6px"><strong>${precipDateLabel}</strong> ${precipTime}</div>`
      : `<div style="${noDataStyle}">No hay datos de precipitación.</div>`

  return `
    <div style="min-width:220px;border-radius:12px;overflow:hidden;font-family:Montserrat,sans-serif;box-shadow:0 8px 20px rgba(0,0,0,0.16)">
      <div style="padding:10px 12px;background:linear-gradient(135deg, ${headerColor} 0%, ${headerColorDark} 100%);color:#fff">
        <div style="font-size:15px;font-weight:700;line-height:1.2">${codigo}</div>
        <div style="font-size:12px;opacity:.92;margin-top:2px;line-height:1.2">${nombre}</div>
      </div>
      <div style="padding:10px 12px;background:#fff;color:#1f2937;font-size:12px;line-height:1.5">
        ${simulationDateSection}
        ${latestSection}
        ${caudalSection}
        ${precipSection}
        <div><strong>Municipio:</strong> ${municipio}</div>
      </div>
    </div>
  `
}
