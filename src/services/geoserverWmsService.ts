import ky from 'ky'

export interface WmsLayerTime {
  layerName: string
  start: string
  end: string
  stepHours: number
}

const cachedCapabilitiesByUrl = new Map<string, Document>()

function getDirectChildText(parent: Element, tagName: string): string | null {
  for (const child of Array.from(parent.children)) {
    if (child.tagName === tagName) {
      return child.textContent?.trim() ?? null
    }
  }

  return null
}

function getTimeDimensionText(layer: Element): string | null {
  for (const child of Array.from(layer.children)) {
    const tagName = child.tagName
    const dimensionName = child.getAttribute('name')?.toLowerCase()

    if ((tagName === 'Dimension' || tagName === 'Extent') && dimensionName === 'time') {
      return child.textContent?.trim() ?? null
    }
  }

  return null
}

function parseDurationHours(step: string): number | null {
  const match = step.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/i)

  if (!match) {
    return null
  }

  const days = Number(match[1] ?? 0)
  const hours = Number(match[2] ?? 0)
  const minutes = Number(match[3] ?? 0)
  const totalHours = days * 24 + hours + minutes / 60

  return totalHours > 0 ? totalHours : null
}

function inferStepHours(values: string[]): number {
  if (values.length < 2) {
    return 1
  }

  const first = Date.parse(values[0])
  const second = Date.parse(values[1])

  if (Number.isNaN(first) || Number.isNaN(second) || second <= first) {
    return 1
  }

  return (second - first) / (1000 * 60 * 60)
}

function parseTimeDimension(layerName: string, rawValue: string): WmsLayerTime | null {
  const value = rawValue.trim()

  if (!value) {
    return null
  }

  if (value.includes('/')) {
    const [start, end, step] = value.split('/')

    if (!start || !end) {
      return null
    }

    return {
      layerName,
      start,
      end,
      stepHours: step ? (parseDurationHours(step) ?? 1) : 1,
    }
  }

  const values = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (!values.length) {
    return null
  }

  return {
    layerName,
    start: values[0],
    end: values[values.length - 1],
    stepHours: inferStepHours(values),
  }
}

async function getWmsCapabilities(url: string): Promise<Document> {
  if (cachedCapabilitiesByUrl.has(url)) {
    return cachedCapabilitiesByUrl.get(url) as Document
  }

  const xmlText = await ky
    .get(url, {
      searchParams: {
        service: 'WMS',
        request: 'GetCapabilities',
      },
    })
    .text()

  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'text/xml')

  cachedCapabilitiesByUrl.set(url, xml)

  return xml
}

export async function getGeoServerLayerTimeDimension(options: {
  url: string
  layerName: string
}): Promise<WmsLayerTime | null> {
  const xml = await getWmsCapabilities(options.url)

  const layers = xml.querySelectorAll('Layer')

  for (const layer of layers) {
    const name = getDirectChildText(layer, 'Name')

    if (name === options.layerName) {
      const timeDimension = getTimeDimensionText(layer)

      if (!timeDimension) {
        return null
      }

      return parseTimeDimension(options.layerName, timeDimension)
    }
  }

  return null
}
