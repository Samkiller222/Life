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
