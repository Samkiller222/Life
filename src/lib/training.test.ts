import { describe, expect, it } from 'vitest'
import { bestSets, describeSets, exerciseOrder, formatMetres, formatMinutes, lastSets, swimPace, weekTotals } from './training'
import type { GymSession, GymSet, SwimSession } from '../types'

const set = (exercise_id: string, position: number, reps: number, weight_kg: number): GymSet => ({
  id: `${exercise_id}-${position}`,
  exercise_id,
  position,
  reps,
  weight_kg,
})

const gym = (id: string, date: string, sets: GymSet[], duration_min: number | null = null): GymSession => ({
  id,
  date,
  name: '',
  duration_min,
  notes: '',
  sets,
})

const swim = (date: string, distance_m: number, duration_min: number | null = null): SwimSession => ({
  id: date,
  date,
  distance_m,
  duration_min,
  focus: '',
  notes: '',
  source: 'manual',
})

const WEEK = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']

describe('weekTotals', () => {
  it('adds up only sessions inside the week', () => {
    const t = weekTotals(
      [gym('a', '2026-10-05', [set('bench', 1, 8, 60), set('bench', 2, 8, 60)], 50), gym('b', '2026-10-04', [set('bench', 1, 5, 80)])],
      [swim('2026-10-06', 2400, 45), swim('2026-10-12', 3000)],
      WEEK,
    )
    expect(t).toEqual({ gymSessions: 1, sets: 2, volumeKg: 960, swims: 1, metres: 2400, minutes: 95 })
  })
})

describe('bestSets', () => {
  it('keeps the heaviest set, with reps breaking ties', () => {
    const best = bestSets([
      gym('a', '2026-10-01', [set('bench', 1, 8, 60), set('squat', 2, 5, 100)]),
      gym('b', '2026-10-03', [set('bench', 1, 6, 65), set('squat', 2, 6, 100)]),
    ])
    expect(best).toContainEqual({ exerciseId: 'bench', reps: 6, weightKg: 65, date: '2026-10-03' })
    expect(best).toContainEqual({ exerciseId: 'squat', reps: 6, weightKg: 100, date: '2026-10-03' })
  })
})

describe('lastSets', () => {
  const history = [gym('a', '2026-10-01', [set('bench', 2, 8, 60), set('bench', 1, 8, 60)]), gym('b', '2026-10-03', [set('squat', 1, 5, 100)])]

  it('finds the most recent session with that exercise, in order', () => {
    expect(lastSets(history, 'bench').map((s) => s.position)).toEqual([1, 2])
  })

  it('skips the session being edited', () => {
    expect(lastSets(history, 'bench', undefined, 'a')).toEqual([])
  })
})

describe('exerciseOrder', () => {
  it('lists exercises in first-seen order', () => {
    expect(exerciseOrder([set('b', 3, 1, 1), set('a', 1, 1, 1), set('b', 2, 1, 1)])).toEqual(['a', 'b'])
  })
})

describe('formatting', () => {
  it('describes sets compactly', () => {
    expect(describeSets([set('x', 1, 8, 60), set('x', 2, 8, 60), set('x', 3, 8, 60)])).toBe('3 × 8 @ 60 kg')
    expect(describeSets([set('x', 1, 8, 60), set('x', 2, 6, 60)])).toBe('8, 6 @ 60 kg')
    expect(describeSets([set('x', 1, 12, 0), set('x', 2, 12, 0)])).toBe('2 × 12 reps')
    expect(describeSets([set('x', 1, 8, 60), set('x', 2, 6, 65)])).toBe('8 @ 60 kg, 6 @ 65 kg')
  })

  it('formats distance, time and pace', () => {
    expect(formatMetres(800)).toBe('800 m')
    expect(formatMinutes(95)).toBe('1 h 35 min')
    expect(formatMinutes(45)).toBe('45 min')
    expect(swimPace(2000, 40)).toBe('2:00 /100 m')
    expect(swimPace(2000, null)).toBe('')
  })
})
