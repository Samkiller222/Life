export type Habit = {
  id: string
  name: string
  days: number[]
  archived: boolean
  created_at: string
}

export type Checkin = {
  habit_id: string
  date: string
}

export type Goal = {
  id: string
  title: string
  unit: string
  target_value: number
  current_value: number
  target_date: string | null
  created_at: string
}

export type Exercise = {
  id: string
  name: string
}

export type GymSet = {
  id: string
  exercise_id: string
  position: number
  reps: number
  weight_kg: number
}

export type GymSession = {
  id: string
  date: string
  name: string
  duration_min: number | null
  notes: string
  sets: GymSet[]
}

export type SwimSession = {
  id: string
  date: string
  distance_m: number
  duration_min: number | null
  focus: string
  notes: string
  source: 'manual' | 'platform'
}
