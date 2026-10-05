import { addDays, daysBetween, parseISODate, toISODate, weekOf } from './dates'
import type { Todo, Trip, TripCost } from '../types'

export type TodoGroup = 'overdue' | 'today' | 'week' | 'later' | 'someday'

export const TODO_GROUPS: { key: TodoGroup; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'later', label: 'Later' },
  { key: 'someday', label: 'No date' },
]

/** Which list an open to-do belongs in. "This week" runs to the end of the Monday-to-Sunday week. */
export function todoGroup(due: string | null, today: string): TodoGroup {
  if (!due) return 'someday'
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  return due <= weekOf(today)[6] ? 'week' : 'later'
}

const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 }

/** Earliest deadline first, then high priority first, then oldest first. */
export function compareTodos(a: Todo, b: Todo): number {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date < b.due_date ? -1 : 1
  }
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.created_at.localeCompare(b.created_at)
}

/** Open to-dos sorted into the groups, skipping empty ones. */
export function groupTodos(todos: Todo[], today: string): { key: TodoGroup; label: string; todos: Todo[] }[] {
  const open = todos.filter((t) => !t.done_at).sort(compareTodos)
  return TODO_GROUPS.map((g) => ({ ...g, todos: open.filter((t) => todoGroup(t.due_date, today) === g.key) })).filter((g) => g.todos.length)
}

/** "Tomorrow", "Fri 9 Oct", "2 days overdue" and so on, relative to today. */
export function dueLabel(due: string, today: string): string {
  const diff = daysBetween(today, due)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${-diff} days overdue`
  const sameYear = due.slice(0, 4) === today.slice(0, 4)
  return parseISODate(due).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
}

export type TripPhase = 'now' | 'upcoming' | 'past' | 'undated'

export function tripPhase(trip: Pick<Trip, 'start_date' | 'end_date'>, today: string): TripPhase {
  const start = trip.start_date
  const end = trip.end_date ?? trip.start_date
  if (!start || !end) return 'undated'
  if (end < today) return 'past'
  if (start > today) return 'upcoming'
  return 'now'
}

/** Current trips first, then upcoming soonest first, then undated, then past most recent first. */
export function sortTrips<T extends Pick<Trip, 'start_date' | 'end_date' | 'name'>>(trips: T[], today: string): T[] {
  const rank = { now: 0, upcoming: 1, undated: 2, past: 3 }
  return [...trips].sort((a, b) => {
    const pa = tripPhase(a, today)
    const pb = tripPhase(b, today)
    if (pa !== pb) return rank[pa] - rank[pb]
    const da = a.start_date ?? ''
    const db = b.start_date ?? ''
    if (da !== db) return pa === 'past' ? db.localeCompare(da) : da.localeCompare(db)
    return a.name.localeCompare(b.name)
  })
}

/** "In 12 days", "Day 2 of 5", "Ended 3 days ago". */
export function tripWhen(trip: Pick<Trip, 'start_date' | 'end_date'>, today: string): string {
  const phase = tripPhase(trip, today)
  if (phase === 'undated' || !trip.start_date) return 'No dates yet'
  const end = trip.end_date ?? trip.start_date
  if (phase === 'upcoming') {
    const d = daysBetween(today, trip.start_date)
    return d === 1 ? 'Tomorrow' : `In ${d} days`
  }
  if (phase === 'now') return `Day ${daysBetween(trip.start_date, today) + 1} of ${daysBetween(trip.start_date, end) + 1}`
  const d = daysBetween(end, today)
  return d === 1 ? 'Ended yesterday' : `Ended ${d} days ago`
}

export function tripDates(trip: Pick<Trip, 'start_date' | 'end_date'>): string {
  if (!trip.start_date) return ''
  const fmt = (s: string) => parseISODate(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  if (!trip.end_date || trip.end_date === trip.start_date) return fmt(trip.start_date)
  return `${fmt(trip.start_date)} to ${fmt(trip.end_date)}`
}

/** Total spent and the split by category, biggest first. Uncategorised costs go under "Other". */
export function tripSpending(costs: TripCost[]): { total: number; byCategory: { category: string; amount: number }[] } {
  const map = new Map<string, number>()
  let total = 0
  for (const c of costs) {
    const key = c.category.trim() || 'Other'
    map.set(key, (map.get(key) ?? 0) + c.amount)
    total += c.amount
  }
  const round = (n: number) => Math.round(n * 100) / 100
  return {
    total: round(total),
    byCategory: [...map].map(([category, amount]) => ({ category, amount: round(amount) })).sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category)),
  }
}

/** Finished to-dos stay visible for this many days before they drop off the list. */
export const KEEP_DONE_DAYS = 7

export function recentlyDone(todos: Todo[], today: string): Todo[] {
  const since = addDays(today, -KEEP_DONE_DAYS)
  return todos.filter((t) => t.done_at && toISODate(new Date(t.done_at)) >= since).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''))
}

/** Offered on an empty trip checklist; you can delete what you don't need. */
export const STARTER_TRIP_ITEMS = ['Passport or ID', 'Travel insurance', 'Book travel', 'Book accommodation', 'Phone charger', 'Plug adapter', 'Toiletries', 'Medication']
