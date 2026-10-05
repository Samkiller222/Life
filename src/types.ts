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

export type CsvFormat = {
  /** Row index (from 0) of the header row. */
  headerRow: number
  dateCol: string
  /** Joined with spaces to make the description. */
  descriptionCols: string[]
  /** One signed amount column, or separate money out and money in columns. */
  amountMode: 'single' | 'split'
  amountCol: string
  outCol: string
  inCol: string
  /** For exports that show spending as positive. */
  flipSign: boolean
  dateOrder: 'dmy' | 'mdy'
}

export type Account = {
  id: string
  name: string
  csv_format: Partial<CsvFormat>
}

export type Category = {
  id: string
  name: string
  kind: 'expense' | 'income' | 'transfer'
  monthly_budget: number | null
  position: number
}

export type Rule = {
  id: string
  pattern: string
  category_id: string
  position: number
}

export type Transaction = {
  id: string
  account_id: string
  date: string
  description: string
  amount: number
  category_id: string | null
  categorised_by: 'rule' | 'manual' | null
}

export type SavingsGoal = {
  id: string
  name: string
  target_amount: number
  saved_amount: number
  target_date: string | null
}

export type TodoPriority = 'low' | 'normal' | 'high'

export type Todo = {
  id: string
  title: string
  notes: string
  due_date: string | null
  priority: TodoPriority
  done_at: string | null
  trip_id: string | null
  created_at: string
}

export type BookStatus = 'want' | 'reading' | 'finished'

export type Book = {
  id: string
  title: string
  author: string
  status: BookStatus
  started_on: string | null
  finished_on: string | null
  rating: number | null
  notes: string
  created_at: string
}

export type Trip = {
  id: string
  name: string
  destination: string
  start_date: string | null
  end_date: string | null
  budget: number | null
  notes: string
}

export type TripItem = {
  id: string
  trip_id: string
  title: string
  done: boolean
  position: number
}

export type TripCost = {
  id: string
  trip_id: string
  description: string
  category: string
  amount: number
}
