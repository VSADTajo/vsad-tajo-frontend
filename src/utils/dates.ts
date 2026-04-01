import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function dateFormattedWithHoursAndMinutes(dateNumber: number): string {
  return format(new Date(dateNumber), 'dd MMM yyyy HH:mm', {
    locale: es,
  })
}

export function dateFormattedWithHours(dateNumber: number): string {
  return format(new Date(dateNumber), 'dd MMM HH:mm', {
    locale: es,
  })
}

export function dateFormattedFromDate(date: Date): string {
  return format(date, 'dd MMM yyyy', {
    locale: es,
  })
}

export function HourFormattedFromDate(date: Date): string {
  return format(date, 'HH:mm', {
    locale: es,
  })
}

export function dateFormattedWithHoursAndMinutesFromDate(date: Date): string {
  return format(date, 'dd MMM yyyy HH:mm', {
    locale: es,
  })
}

export function formatSimulationDate(dateStr: string): string {
  try {
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    const hours = dateStr.substring(8, 10)
    const minutes = dateStr.substring(10, 12)

    const dateObj = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`)
    return format(dateObj, 'dd MMM yyyy HH:mm', { locale: es })
  } catch {
    return dateStr
  }
}
