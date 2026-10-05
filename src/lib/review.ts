import { weekOf } from './dates'

/** What review_week_stats returns: one week's numbers across every module. */
export type WeekStats = {
  week_start: string
  week_end: string
  habits: { due: number; done: number; items: { name: string; due: number; done: number }[] }
  goals: { title: string; unit: string; current: number; target: number; target_date: string | null; added_this_week: number }[]
  training: {
    gym_sessions: number
    gym_minutes: number
    gym_sets: number
    gym_volume_kg: number
    swim_sessions: number
    swim_metres: number
    swim_minutes: number
  }
  money: {
    spent: number
    income: number
    transactions: number
    uncategorised: number
    top_categories: { category: string; spent: number }[]
    budgets: { category: string; budget: number; spent_month_to_date: number }[]
  }
  admin: {
    todos_done: string[]
    todos_overdue: { title: string; due: string; priority: string }[]
    todos_due_next_week: { title: string; due: string; priority: string }[]
    books_finished: string[]
    books_reading: string[]
    trips_soon: { name: string; start: string }[]
  }
}

export type WeekReview = {
  id: string
  week_start: string
  summary: string
  patterns: string[]
  focus: string[]
  created_at: string
}

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  return weekOf(date)[0]
}

/** Share of due habit check-ins that were done, 0 to 100, or null when nothing was due. */
export function habitRate(habits: WeekStats['habits']): number | null {
  if (!habits.due) return null
  return Math.round((Math.min(habits.done, habits.due) / habits.due) * 100)
}

/** True when the week has nothing logged in any module. */
export function isQuietWeek(s: WeekStats): boolean {
  const t = s.training
  return (
    s.habits.done === 0 &&
    s.goals.every((g) => !g.added_this_week) &&
    t.gym_sessions + t.swim_sessions === 0 &&
    s.money.transactions === 0 &&
    s.admin.todos_done.length + s.admin.books_finished.length === 0
  )
}

/** Keeps only string items, so a malformed row can't break the page. */
export function toLines(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
}
