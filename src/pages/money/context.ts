import { useOutletContext } from 'react-router-dom'
import type { useMoney } from '../../hooks/useMoney'

/** The money data that MoneyLayout loads once and shares with its tabs. */
export function useMoneyContext() {
  return useOutletContext<ReturnType<typeof useMoney>>()
}
