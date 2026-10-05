import { useOutletContext } from 'react-router-dom'
import type { useTraining } from '../../hooks/useTraining'

/** The training data that TrainingLayout loads once and shares with its tabs. */
export function useTrainingContext() {
  return useOutletContext<ReturnType<typeof useTraining>>()
}
