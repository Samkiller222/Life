import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { addDays, today } from '../lib/dates'
import type { Exercise, GymSession, SwimSession } from '../types'

// A year of training covers the week view, history and best sets.
const HISTORY_DAYS = 366

type GymRow = Omit<GymSession, 'sets'> & { training_gym_sets: GymSession['sets'] }

async function fetchTraining() {
  if (!supabase) return { error: '', exercises: [], gym: [], swims: [] }
  const since = addDays(today(), -HISTORY_DAYS)
  const [e, g, s] = await Promise.all([
    supabase.from('training_exercises').select('id, name').order('name'),
    supabase
      .from('training_gym_sessions')
      .select('id, date, name, duration_min, notes, training_gym_sets(id, exercise_id, position, reps, weight_kg)')
      .gte('date', since)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('training_swim_sessions')
      .select('id, date, distance_m, duration_min, focus, notes, source')
      .gte('date', since)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])
  return {
    error: (e.error ?? g.error ?? s.error)?.message ?? '',
    exercises: (e.data ?? []) as Exercise[],
    gym: ((g.data ?? []) as GymRow[]).map(({ training_gym_sets, ...rest }) => ({
      ...rest,
      sets: [...training_gym_sets].sort((a, b) => a.position - b.position),
    })),
    swims: (s.data ?? []) as SwimSession[],
  }
}

export type GymInput = {
  id?: string
  date: string
  name: string
  duration_min: number | null
  notes: string
  sets: { exercise: string; reps: number; weight_kg: number }[]
}

export type SwimInput = Omit<SwimSession, 'id' | 'source'> & { id?: string }

export function useTraining() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [gym, setGym] = useState<GymSession[]>([])
  const [swims, setSwims] = useState<SwimSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const apply = useCallback((r: Awaited<ReturnType<typeof fetchTraining>>) => {
    if (r.error) setError(r.error)
    else {
      setError('')
      setExercises(r.exercises)
      setGym(r.gym)
      setSwims(r.swims)
    }
    setLoading(false)
  }, [])

  const load = useCallback(() => fetchTraining().then(apply), [apply])

  useEffect(() => {
    fetchTraining().then(apply)
  }, [apply])

  const exerciseName = useMemo(() => new Map(exercises.map((e) => [e.id, e.name])), [exercises])

  /** Saves a gym session; returns false if it failed. */
  async function saveGym(input: GymInput) {
    if (!supabase) return false
    const { error } = await supabase.rpc('training_save_gym_session', {
      p_id: input.id ?? null,
      p_date: input.date,
      p_name: input.name,
      p_duration_min: input.duration_min,
      p_notes: input.notes,
      p_sets: input.sets,
    })
    if (error) setError(error.message)
    await load()
    return !error
  }

  async function removeGym(id: string) {
    if (!supabase) return
    const { error } = await supabase.from('training_gym_sessions').delete().eq('id', id)
    if (error) setError(error.message)
    await load()
  }

  /** Saves a swim; returns false if it failed. */
  async function saveSwim(input: SwimInput) {
    if (!supabase) return false
    const { id, ...fields } = input
    const { error } = id
      ? await supabase.from('training_swim_sessions').update(fields).eq('id', id)
      : await supabase.from('training_swim_sessions').insert(fields)
    if (error) setError(error.message)
    await load()
    return !error
  }

  async function removeSwim(id: string) {
    if (!supabase) return
    const { error } = await supabase.from('training_swim_sessions').delete().eq('id', id)
    if (error) setError(error.message)
    await load()
  }

  return { exercises, exerciseName, gym, swims, loading, error, saveGym, removeGym, saveSwim, removeSwim }
}
