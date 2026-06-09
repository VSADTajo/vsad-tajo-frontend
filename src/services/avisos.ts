import { api } from './api'

export interface CategoriaActiva {
  code: string
  name: string
  count: number
}

export interface AvisosResumen {
  categoriasActivas: CategoriaActiva[]
  totalAvisos: number
}

export async function getAvisosResumenService(): Promise<AvisosResumen> {
  return api
    .get('meteo/avisos/resumen', {
      headers: { Accept: 'application/json' },
    })
    .json<AvisosResumen>()
}

export async function getAvisosByTipoService(tipo: string): Promise<unknown> {
  return api
    .get('meteo/avisos', {
      searchParams: {
        tipo,
      },
      headers: {
        Accept: 'application/json',
      },
    })
    .json<unknown>()
}
