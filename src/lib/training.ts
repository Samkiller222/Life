import type { GymSession, GymSet, SwimSession } from '../types'

export type WeekTotals = {
  gymSessions: number
  sets: number
  volumeKg: number
  swims: number
  metres: number
  minutes: number
}

/** Totals for the sessions that fall on the given dates. */
export function weekTotals(gym: GymSession[], swims: SwimSession[], dates: string[]): WeekTotals {
  const inWeek = new Set(dates)
  const g = gym.filter((s) => inWeek.has(s.date))
  const w = swims.filter((s) => inWeek.has(s.date))
  const sets = g.flatMap((s) => s.sets)
  return {
    gymSessions: g.length,
    sets: sets.length,
    volumeKg: sets.reduce((sum, x) => sum + x.reps * x.weight_kg, 0),
    swims: w.length,
    metres: w.reduce((sum, s) => sum + s.distance_m, 0),
    minutes: [...g, ...w].reduce((sum, s) => sum + (s.duration_min ?? 0), 0),
  }
}

/** Exercise ids in the order they first appear in a session. */
export function exerciseOrder(sets: GymSet[]): string[] {
  const ids: string[] = []
  for (const s of [...sets].sort((a, b) => a.position - b.position)) if (!ids.includes(s.exercise_id)) ids.push(s.exercise_id)
  return ids
}

export type BestSet = { exerciseId: string; reps: number; weightKg: number; date: string }

/** Heaviest set per exercise; more reps break a tie, then the earliest date. */
export function bestSets(gym: GymSession[]): BestSet[] {
  const best = new Map<string, BestSet>()
  const sessions = [...gym].sort((a, b) => a.date.localeCompare(b.date))
  for (const session of sessions) {
    for (const s of session.sets) {
      const cur = best.get(s.exercise_id)
      if (!cur || s.weight_kg > cur.weightKg || (s.weight_kg === cur.weightKg && s.reps > cur.reps)) {
        best.set(s.exercise_id, { exerciseId: s.exercise_id, reps: s.reps, weightKg: s.weight_kg, date: session.date })
      }
    }
  }
  return [...best.values()]
}

/** The sets for an exercise from the most recent session that included it, optionally before a date. */
export function lastSets(gym: GymSession[], exerciseId: string, before?: string, excludeSessionId?: string): GymSet[] {
  const sessions = gym
    .filter((s) => s.id !== excludeSessionId && (!before || s.date <= before))
    .sort((a, b) => b.date.localeCompare(a.date))
  for (const session of sessions) {
    const sets = session.sets.filter((s) => s.exercise_id === exerciseId).sort((a, b) => a.position - b.position)
    if (sets.length) return sets
  }
  return []
}

/** "3 × 8 @ 60 kg", or a list like "8, 8, 6 @ 60 kg" when reps differ. */
export function describeSets(sets: Pick<GymSet, 'reps' | 'weight_kg'>[]): string {
  if (!sets.length) return ''
  const sameReps = sets.every((s) => s.reps === sets[0].reps)
  const sameWeight = sets.every((s) => s.weight_kg === sets[0].weight_kg)
  if (!sameWeight) return sets.map((s) => `${s.reps} @ ${formatKg(s.weight_kg)}`).join(', ')
  const reps = sameReps ? `${sets.length} × ${sets[0].reps}` : sets.map((s) => s.reps).join(', ')
  return sets[0].weight_kg ? `${reps} @ ${formatKg(sets[0].weight_kg)}` : `${reps} reps`
}

export function formatKg(kg: number): string {
  return `${Number(kg.toFixed(2)).toLocaleString()} kg`
}

export function formatMetres(m: number): string {
  return m >= 1000 ? `${Number((m / 1000).toFixed(2)).toLocaleString()} km` : `${m} m`
}

export function formatMinutes(min: number): string {
  const total = Math.round(min)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Pace per 100 m, like "1:52 /100 m". */
export function swimPace(distanceM: number, minutes: number | null): string {
  if (!minutes || !distanceM) return ''
  const secs = Math.round((minutes * 60 * 100) / distanceM)
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} /100 m`
}
