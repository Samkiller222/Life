import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Goal } from '../types'

export type NewGoal = Pick<Goal, 'title' | 'unit' | 'target_value' | 'target_date'>

async function fetchGoals() {
  if (!supabase) return { error: '', goals: [] }
  const { data, error } = await supabase
    .from('goals')
    .select('id, title, unit, target_value, current_value, target_date, created_at')
    .order('created_at')
  return { error: error?.message ?? '', goals: (data ?? []) as Goal[] }
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const apply = useCallback((r: Awaited<ReturnType<typeof fetchGoals>>) => {
    if (r.error) setError(r.error)
    else setGoals(r.goals)
    setLoading(false)
  }, [])

  const load = useCallback(() => fetchGoals().then(apply), [apply])

  useEffect(() => {
    fetchGoals().then(apply)
  }, [apply])

  async function add(goal: NewGoal) {
    if (!supabase) return
    const { error } = await supabase.from('goals').insert(goal)
    if (error) setError(error.message)
    await load()
  }

  async function logProgress(goalId: string, value: number, note = '') {
    if (!supabase) return
    const { error } = await supabase.rpc('log_goal_progress', { p_goal_id: goalId, p_value: value, p_note: note })
    if (error) setError(error.message)
    await load()
  }

  async function remove(goalId: string) {
    if (!supabase) return
    const { error } = await supabase.from('goals').delete().eq('id', goalId)
    if (error) setError(error.message)
    await load()
  }

  return { goals, loading, error, add, logProgress, remove }
}
