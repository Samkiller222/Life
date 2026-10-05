import { useOutletContext } from 'react-router-dom'
import type { useAdmin } from '../../hooks/useAdmin'

/** The life admin data that AdminLayout loads once and shares with its tabs. */
export function useAdminContext() {
  return useOutletContext<ReturnType<typeof useAdmin>>()
}
