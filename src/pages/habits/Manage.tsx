import { useState, type FormEvent } from 'react'
import { useHabitsContext } from './context'
import { WEEKDAY_LABELS } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'
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
          aria-pressed={days.includes(d)}
          aria-label={WEEKDAY_LABELS[d]}
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
      <input className="input prose" value={name} onChange={(e) => setName(e.target.value)} aria-label="Habit name" />
      <DayPicker days={days} onChange={setDays} />
      <div className="row">
        {changed && (
          <button type="button" className="btn stamp sm" onClick={() => save({ id: habit.id, name: name.trim(), days })} disabled={!name.trim() || !days.length}>
            Save
          </button>
        )}
        <button type="button" className="link-btn" onClick={() => save({ id: habit.id, name: habit.name, days: habit.days, archived: !habit.archived })}>
          {habit.archived ? 'Restore' : 'Archive'}
        </button>
        {habit.archived && (
          <button type="button" className="link-btn danger" onClick={() => confirm(`Delete "${habit.name}" and all its check-ins?`) && remove(habit.id)}>
            Delete
          </button>
        )}
      </div>
    </li>
  )
}

export default function Manage() {
  const { habits, active, save } = useHabitsContext()
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
    <div className="grid">
      <Panel title="Add a habit">
        <form onSubmit={add}>
          <div className="field prose">
            <label className="field-label" htmlFor="habit-name">
              Habit
            </label>
            <input id="habit-name" placeholder="Stretch for 10 minutes" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <span className="field-label">Due on</span>
            <DayPicker days={days} onChange={setDays} />
          </div>
          <div className="actions">
            <button type="submit" className="btn stamp" disabled={!name.trim() || !days.length}>
              Add habit
            </button>
          </div>
        </form>
      </Panel>
      <Panel title="Your habits" meta={<span className="tag">{active.length} active</span>}>
        {habits.length === 0 ? (
          <EmptyState>Habits you add will appear here.</EmptyState>
        ) : (
          <ul className="checklist">
            {habits.map((h) => (
              <HabitRow key={h.id + h.name + h.days.join() + h.archived} habit={h} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
