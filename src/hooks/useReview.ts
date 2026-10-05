import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toLines, type WeekReview, type WeekStats } from '../lib/review'

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

async function fetchStats(week: string): Promise<{ error: string; stats: WeekStats | null }> {
  if (!supabase) return { error: '', stats: null }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: '', stats: null }
  const { data, error } = await supabase.rpc('review_week_stats', { p_user_id: auth.user.id, p_week_start: week, p_tz: timeZone })
  return { error: error?.message ?? '', stats: (data as WeekStats | null) ?? null }
}

/** Past written reviews, newest first, and the live numbers for one week. */
export function useReview(week: string) {
  const [reviews, setReviews] = useState<WeekReview[]>([])
  // Tagged with its week, so stale numbers never show while another week loads.
  const [loaded, setLoaded] = useState<{ week: string; stats: WeekStats } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('review_weeks')
      .select('id, week_start, summary, patterns, focus, created_at')
      .order('week_start', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setReviews((data ?? []).map((r) => ({ ...r, patterns: toLines(r.patterns), focus: toLines(r.focus) })) as WeekReview[])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchStats(week).then((r) => {
      if (r.error) setError(r.error)
      else if (r.stats) setLoaded({ week, stats: r.stats })
    })
  }, [week])

  const stats = loaded?.week === week ? loaded.stats : null

  async function removeReview(id: string) {
    if (!supabase) return
    const { error } = await supabase.from('review_weeks').delete().eq('id', id)
    if (error) setError(error.message)
    else setReviews((rs) => rs.filter((r) => r.id !== id))
  }

  return { reviews, stats, loading, error, removeReview }
}
