// Dates are handled as local YYYY-MM-DD strings, matching Postgres `date`.

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function weekday(s: string): number {
  return parseISODate(s).getDay()
}

export function today(): string {
  return toISODate(new Date())
}

/** The 7 dates of the Monday-to-Sunday week containing `s`. */
export function weekOf(s: string): string[] {
  const offset = (weekday(s) + 6) % 7
  const monday = addDays(s, -offset)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000)
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
