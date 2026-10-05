import { describe, expect, it } from 'vitest'
import { compareTodos, dueLabel, groupTodos, recentlyDone, sortTrips, todoGroup, tripPhase, tripSpending, tripWhen } from './admin'
import type { Todo, TripCost } from '../types'

// 2026-10-07 is a Wednesday; its week runs Monday 5 to Sunday 11 October.
const TODAY = '2026-10-07'

function todo(p: Partial<Todo>): Todo {
  return { id: p.title ?? 'x', title: 'x', notes: '', due_date: null, priority: 'normal', done_at: null, trip_id: null, created_at: '2026-10-01T10:00:00Z', ...p }
}

describe('todoGroup', () => {
  it('sorts deadlines into overdue, today, this week, later and no date', () => {
    expect(todoGroup('2026-10-06', TODAY)).toBe('overdue')
    expect(todoGroup(TODAY, TODAY)).toBe('today')
    expect(todoGroup('2026-10-11', TODAY)).toBe('week')
    expect(todoGroup('2026-10-12', TODAY)).toBe('later')
    expect(todoGroup(null, TODAY)).toBe('someday')
  })

  it('treats Sunday as the end of the week', () => {
    expect(todoGroup('2026-10-12', '2026-10-11')).toBe('later')
    expect(todoGroup('2026-10-18', '2026-10-12')).toBe('week')
  })
})

describe('groupTodos', () => {
  it('drops finished to-dos and empty groups, and orders by deadline then priority', () => {
    const groups = groupTodos(
      [
        todo({ title: 'later', due_date: '2026-11-01' }),
        todo({ title: 'done', due_date: TODAY, done_at: '2026-10-07T09:00:00Z' }),
        todo({ title: 'low', due_date: TODAY, priority: 'low' }),
        todo({ title: 'high', due_date: TODAY, priority: 'high' }),
        todo({ title: 'none' }),
      ],
      TODAY,
    )
    expect(groups.map((g) => g.key)).toEqual(['today', 'later', 'someday'])
    expect(groups[0].todos.map((t) => t.title)).toEqual(['high', 'low'])
  })

  it('puts dated to-dos before undated ones', () => {
    expect(compareTodos(todo({ due_date: '2027-01-01' }), todo({}))).toBeLessThan(0)
  })
})

describe('dueLabel', () => {
  it('uses words near today and counts overdue days', () => {
    expect(dueLabel(TODAY, TODAY)).toBe('Today')
    expect(dueLabel('2026-10-08', TODAY)).toBe('Tomorrow')
    expect(dueLabel('2026-10-06', TODAY)).toBe('Yesterday')
    expect(dueLabel('2026-10-04', TODAY)).toBe('3 days overdue')
  })
})

describe('recentlyDone', () => {
  it('keeps to-dos finished in the last week, newest first', () => {
    const list = recentlyDone(
      [
        todo({ title: 'old', done_at: '2026-09-20T10:00:00' }),
        todo({ title: 'a', done_at: '2026-10-05T10:00:00' }),
        todo({ title: 'b', done_at: '2026-10-06T10:00:00' }),
        todo({ title: 'open' }),
      ],
      TODAY,
    )
    expect(list.map((t) => t.title)).toEqual(['b', 'a'])
  })
})

describe('trips', () => {
  const trip = (name: string, start_date: string | null, end_date: string | null) => ({ name, start_date, end_date })

  it('knows whether a trip is on now, coming up, over or undated', () => {
    expect(tripPhase(trip('a', '2026-10-05', '2026-10-09'), TODAY)).toBe('now')
    expect(tripPhase(trip('a', '2026-10-07', null), TODAY)).toBe('now')
    expect(tripPhase(trip('a', '2026-10-20', '2026-10-25'), TODAY)).toBe('upcoming')
    expect(tripPhase(trip('a', '2026-09-01', '2026-09-05'), TODAY)).toBe('past')
    expect(tripPhase(trip('a', null, null), TODAY)).toBe('undated')
  })

  it('orders current, then upcoming soonest, then undated, then past newest', () => {
    const sorted = sortTrips(
      [
        trip('old', '2026-01-01', '2026-01-05'),
        trip('recent', '2026-09-01', '2026-09-05'),
        trip('idea', null, null),
        trip('far', '2027-03-01', '2027-03-05'),
        trip('soon', '2026-10-20', '2026-10-25'),
        trip('now', '2026-10-06', '2026-10-08'),
      ],
      TODAY,
    )
    expect(sorted.map((t) => t.name)).toEqual(['now', 'soon', 'far', 'idea', 'recent', 'old'])
  })

  it('describes when a trip is', () => {
    expect(tripWhen(trip('a', '2026-10-17', '2026-10-20'), TODAY)).toBe('In 10 days')
    expect(tripWhen(trip('a', '2026-10-06', '2026-10-10'), TODAY)).toBe('Day 2 of 5')
    expect(tripWhen(trip('a', '2026-10-01', '2026-10-04'), TODAY)).toBe('Ended 3 days ago')
    expect(tripWhen(trip('a', null, null), TODAY)).toBe('No dates yet')
  })

  it('totals spending by category, biggest first', () => {
    const cost = (category: string, amount: number): TripCost => ({ id: category + amount, trip_id: 't', description: 'x', category, amount })
    const s = tripSpending([cost('Stay', 300), cost('Food', 20.1), cost('food ', 0), cost('', 5), cost('Food', 40.2)])
    expect(s.total).toBe(365.3)
    expect(s.byCategory[0]).toEqual({ category: 'Stay', amount: 300 })
    expect(s.byCategory.find((c) => c.category === 'Food')?.amount).toBe(60.3)
    expect(s.byCategory.find((c) => c.category === 'Other')?.amount).toBe(5)
  })
})
