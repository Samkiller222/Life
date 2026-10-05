import { describe, expect, it } from 'vitest'
import { habitRate, isQuietWeek, toLines, weekStart, type WeekStats } from './review'

const empty: WeekStats = {
  week_start: '2026-10-05',
  week_end: '2026-10-11',
  habits: { due: 0, done: 0, items: [] },
  goals: [],
  training: { gym_sessions: 0, gym_minutes: 0, gym_sets: 0, gym_volume_kg: 0, swim_sessions: 0, swim_metres: 0, swim_minutes: 0 },
  money: { spent: 0, income: 0, transactions: 0, uncategorised: 0, top_categories: [], budgets: [] },
  admin: { todos_done: [], todos_overdue: [], todos_due_next_week: [], books_finished: [], books_reading: [], trips_soon: [] },
}

describe('weekStart', () => {
  it('returns the Monday of the week', () => {
    expect(weekStart('2026-10-05')).toBe('2026-10-05')
    expect(weekStart('2026-10-11')).toBe('2026-10-05')
    expect(weekStart('2026-10-12')).toBe('2026-10-12')
  })
})

describe('habitRate', () => {
  it('is null when nothing was due', () => {
    expect(habitRate({ due: 0, done: 0, items: [] })).toBeNull()
  })
  it('rounds to a percentage and caps at 100', () => {
    expect(habitRate({ due: 3, done: 1, items: [] })).toBe(33)
    expect(habitRate({ due: 2, done: 5, items: [] })).toBe(100)
  })
})

describe('isQuietWeek', () => {
  it('is true with nothing logged', () => {
    expect(isQuietWeek(empty)).toBe(true)
  })
  it('is false once anything is logged', () => {
    expect(isQuietWeek({ ...empty, training: { ...empty.training, swim_sessions: 1 } })).toBe(false)
    expect(isQuietWeek({ ...empty, admin: { ...empty.admin, todos_done: ['Renew passport'] } })).toBe(false)
  })
})

describe('toLines', () => {
  it('keeps non-empty strings only', () => {
    expect(toLines(['a', '', 3, null, 'b'])).toEqual(['a', 'b'])
    expect(toLines('not a list')).toEqual([])
  })
})
