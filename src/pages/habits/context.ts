import { useOutletContext } from 'react-router-dom'
import type { useHabits } from '../../hooks/useHabits'

/** The habits data that HabitsLayout loads once and shares with its tabs. */
export function useHabitsContext() {
  return useOutletContext<ReturnType<typeof useHabits>>()
}
