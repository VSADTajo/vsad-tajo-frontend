import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function dateFormattedWithHoursAndMinutes(dateNumber: number): string {
  return format(new Date(dateNumber), 'dd MMM yyyy HH:mm', {
    locale: es,
  })
}

export function dateFormattedWithHours(dateNumber: number): string {
  return format(new Date(dateNumber), 'dd MMM yyyy HH:mm', {
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
