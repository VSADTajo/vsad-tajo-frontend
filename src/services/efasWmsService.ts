import ky from 'ky'

export interface WmsLayerTime {
  layerName: string
  start: string
  end: string
  stepHours: number
}

const EFAS_WMS = 'https://european-flood.emergency.copernicus.eu/api/wms/'

let cachedCapabilities: Document | null = null

async function getEFASCapabilities(): Promise<Document> {
  if (cachedCapabilities) return cachedCapabilities

  const xmlText = await ky
    .get(EFAS_WMS, {
      searchParams: {
        service: 'WMS',
        request: 'GetCapabilities',
      },
    })
    .text()

  const parser = new DOMParser()

  cachedCapabilities = parser.parseFromString(xmlText, 'text/xml')

  return cachedCapabilities
}

export async function getLayerTimeDimension(layerName: string): Promise<WmsLayerTime | null> {
  const xml = await getEFASCapabilities()

  console.log('xmlxml', xml)

  const layers = xml.querySelectorAll('Layer')

  for (const layer of layers) {
    const name = layer.querySelector('Name')?.textContent

    if (name === layerName) {
      const dim = layer.querySelector('Dimension[name="time"]')

      if (!dim) return null

      const text = dim.textContent ?? ''

      const [start, end, step] = text.split('/')

      const stepHours = Number(step.replace('PT', '').replace('H', ''))

      return {
        layerName,
        start,
        end,
        stepHours,
      }
    }
  }

  return null
}
