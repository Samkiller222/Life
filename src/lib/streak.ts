import { addDays, weekday } from './dates'

/**
 * Consecutive scheduled days completed, counting back from `today`.
 * Days the habit isn't scheduled are skipped. If today is scheduled but not
 * done yet, the streak still stands (counted from the last scheduled day).
 * `since` stops the count at the habit's creation date.
 */
export function streak(done: Set<string>, days: number[], today: string, since: string): number {
  if (days.length === 0) return 0
  let count = 0
  let date = today
  if (days.includes(weekday(date)) && !done.has(date)) date = addDays(date, -1)
  while (date >= since) {
    if (days.includes(weekday(date))) {
      if (!done.has(date)) break
      count++
    }
    date = addDays(date, -1)
  }
  return count
}

/** Share of scheduled days in `dates` (up to `today`) that were completed, 0 to 1, or null if none were due. */
export function completionRate(done: Set<string>, days: number[], dates: string[], today: string): number | null {
  const due = dates.filter((d) => d <= today && days.includes(weekday(d)))
  if (due.length === 0) return null
  return due.filter((d) => done.has(d)).length / due.length
}
