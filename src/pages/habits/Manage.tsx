import { useState, type FormEvent } from 'react'
import { useHabitsContext } from './context'
import { WEEKDAY_LABELS } from '../../lib/dates'
import type { Habit } from '../../types'

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
// Show Monday first.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function DayPicker({ days, onChange }: { days: number[]; onChange: (d: number[]) => void }) {
  return (
    <div className="days">
      {DAY_ORDER.map((d) => (
        <button
          type="button"
          key={d}
          className={days.includes(d) ? 'day on' : 'day'}
          onClick={() => onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort())}
        >
          {WEEKDAY_LABELS[d][0]}
        </button>
      ))}
    </div>
  )
}

function HabitRow({ habit }: { habit: Habit }) {
  const { save, remove } = useHabitsContext()
  const [name, setName] = useState(habit.name)
  const [days, setDays] = useState(habit.days)
  const changed = name !== habit.name || days.join() !== habit.days.join()

  return (
    <li className={habit.archived ? 'archived' : ''}>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <DayPicker days={days} onChange={setDays} />
      <div className="row">
        {changed && (
          <button onClick={() => save({ id: habit.id, name: name.trim(), days })} disabled={!name.trim() || !days.length}>
            Save
          </button>
        )}
        <button className="link" onClick={() => save({ id: habit.id, name: habit.name, days: habit.days, archived: !habit.archived })}>
          {habit.archived ? 'Restore' : 'Archive'}
        </button>
        {habit.archived && (
          <button
            className="link danger"
            onClick={() => confirm(`Delete "${habit.name}" and all its check-ins?`) && remove(habit.id)}
          >
            Delete
          </button>
        )}
      </div>
    </li>
  )
}

export default function Manage() {
  const { habits, save } = useHabitsContext()
  const [name, setName] = useState('')
  const [days, setDays] = useState(ALL_DAYS)

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !days.length) return
    await save({ name: name.trim(), days })
    setName('')
    setDays(ALL_DAYS)
  }

  return (
    <>
      <form className="panel row wrap" onSubmit={add}>
        <input placeholder="New habit, e.g. Stretch 10 min" value={name} onChange={(e) => setName(e.target.value)} />
        <DayPicker days={days} onChange={setDays} />
        <button type="submit" disabled={!name.trim() || !days.length}>
          Add habit
        </button>
      </form>
      <ul className="panel habit-list">
        {habits.length === 0 && <li className="muted">No habits yet.</li>}
        {habits.map((h) => (
          <HabitRow key={h.id + h.name + h.days.join() + h.archived} habit={h} />
        ))}
      </ul>
    </>
  )
}
