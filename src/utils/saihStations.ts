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

function buildAlertChip(value: number | null, props: Record<string, unknown>): string {
  if (value == null) {
    return '<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#e5e7eb;color:#374151;font-weight:700">--</span>'
  }

  const yellowThreshold = readNumericValue(props, ['umbral_amarillo', 'threshold_yellow']) ?? 40
  const orangeThreshold = readNumericValue(props, ['umbral_naranja', 'threshold_orange']) ?? 70
  const redThreshold = readNumericValue(props, ['umbral_rojo', 'threshold_red']) ?? 90

  const formatValue = Number.isInteger(value) ? String(value) : value.toFixed(1)

  if (value >= redThreshold) {
    return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#dc2626;color:#fff;font-weight:700">${formatValue}</span>`
  }

  if (value >= orangeThreshold) {
    return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#f97316;color:#fff;font-weight:700">${formatValue}</span>`
  }

  if (value >= yellowThreshold) {
    return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#facc15;color:#1f2937;font-weight:700">${formatValue}</span>`
  }

  return `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;background:#e5e7eb;color:#374151;font-weight:700">${formatValue}</span>`
}

export function buildSaihPopupContent(feature: GeoJSON.Feature): string {
  const props = (feature.properties ?? {}) as Record<string, unknown>

  const tipo = String(props.tipo_cod ?? props.tipo ?? '')
  const headerColor = getSaihTypeColor(tipo)
  const headerColorDark = darkenHex(headerColor, 0.72)

  const codigo = escapeHtml(props.codigo)
  const nombre = escapeHtml(props.nombre)
  const municipio = escapeHtml(props.municipio)
  const mockValue = 82.4
  const mockValueTime = '2026-04-09 12:00'
  const valueChip = buildAlertChip(mockValue, props)
  const valueTime = escapeHtml(mockValueTime)

  return `
    <div style="min-width:220px;border-radius:12px;overflow:hidden;font-family:Montserrat,sans-serif;box-shadow:0 8px 20px rgba(0,0,0,0.16)">
      <div style="padding:10px 12px;background:linear-gradient(135deg, ${headerColor} 0%, ${headerColorDark} 100%);color:#fff">
        <div style="font-size:15px;font-weight:700;line-height:1.2">${codigo}</div>
        <div style="font-size:12px;opacity:.92;margin-top:2px;line-height:1.2">${nombre}</div>
      </div>
      <div style="padding:10px 12px;background:#fff;color:#1f2937;font-size:12px;line-height:1.5">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
          <strong>Valor</strong>
          ${valueChip}
        </div>
        <div style="margin-bottom:6px"><strong>Hora:</strong> ${valueTime}</div>
        <div><strong>Municipio:</strong> ${municipio}</div>
      </div>
    </div>
  `
}
