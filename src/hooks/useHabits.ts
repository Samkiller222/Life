import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { addDays, today } from '../lib/dates'
import type { Checkin, Habit } from '../types'

// A year of check-ins is plenty for streaks and weekly summaries.
const HISTORY_DAYS = 366

async function fetchHabits() {
  if (!supabase) return { error: '', habits: [], checkins: [] }
  const [h, c] = await Promise.all([
    supabase.from('habits').select('id, name, days, archived, created_at').order('created_at'),
    supabase.from('habit_checkins').select('habit_id, date').gte('date', addDays(today(), -HISTORY_DAYS)),
  ])
  return {
    error: (h.error ?? c.error)?.message ?? '',
    habits: (h.data ?? []) as Habit[],
    checkins: (c.data ?? []) as Checkin[],
  }
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const apply = useCallback((r: Awaited<ReturnType<typeof fetchHabits>>) => {
    if (r.error) setError(r.error)
    else {
      setHabits(r.habits)
      setCheckins(r.checkins)
    }
    setLoading(false)
  }, [])

  const load = useCallback(() => fetchHabits().then(apply), [apply])

  useEffect(() => {
    fetchHabits().then(apply)
  }, [apply])

  /** Set of completed dates per habit id. */
  const doneByHabit = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const c of checkins) {
      if (!map.has(c.habit_id)) map.set(c.habit_id, new Set())
      map.get(c.habit_id)!.add(c.date)
    }
    return map
  }, [checkins])

  async function toggle(habitId: string, date: string) {
    if (!supabase) return
    const isDone = doneByHabit.get(habitId)?.has(date)
    // Update the screen straight away, then save.
    setCheckins((prev) =>
      isDone ? prev.filter((c) => !(c.habit_id === habitId && c.date === date)) : [...prev, { habit_id: habitId, date }],
    )
    const { error } = isDone
      ? await supabase.from('habit_checkins').delete().match({ habit_id: habitId, date })
      : await supabase.from('habit_checkins').insert({ habit_id: habitId, date })
    if (error) {
      setError(error.message)
      load()
    }
  }

  async function save(habit: Partial<Habit> & { name: string; days: number[] }) {
    if (!supabase) return
    const { id, ...fields } = habit
    const { error } = id
      ? await supabase.from('habits').update(fields).eq('id', id)
      : await supabase.from('habits').insert(fields)
    if (error) setError(error.message)
    await load()
  }

  async function remove(habitId: string) {
    if (!supabase) return
    const { error } = await supabase.from('habits').delete().eq('id', habitId)
    if (error) setError(error.message)
    await load()
  }

  return {
    habits,
    active: habits.filter((h) => !h.archived),
    doneByHabit,
    loading,
    error,
    toggle,
    save,
    remove,
  }
}
