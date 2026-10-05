import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAdminContext } from './context'
import { dueLabel } from '../../lib/admin'
import { addDays, today } from '../../lib/dates'
import type { Todo, TodoPriority } from '../../types'

const PRIORITIES: { value: TodoPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]

function DueBadge({ due }: { due: string }) {
  const now = today()
  const cls = due < now ? 'badge err' : due === now ? 'badge warn' : 'badge'
  return <span className={cls}>{dueLabel(due, now)}</span>
}

/** Title, deadline, priority and (outside a trip) which trip it belongs to. */
function TodoFields({
  idPrefix,
  title,
  setTitle,
  due,
  setDue,
  priority,
  setPriority,
  tripId,
  setTripId,
}: {
  idPrefix: string
  title: string
  setTitle: (v: string) => void
  due: string
  setDue: (v: string) => void
  priority: TodoPriority
  setPriority: (v: TodoPriority) => void
  tripId?: string
  setTripId?: (v: string) => void
}) {
  const { trips } = useAdminContext()
  const now = today()
  return (
    <div className="fields-grid">
      <div className="field prose full">
        <label className="field-label" htmlFor={`${idPrefix}-title`}>
          To-do
        </label>
        <input id={`${idPrefix}-title`} placeholder="Renew passport" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${idPrefix}-due`}>
          Deadline
        </label>
        <input id={`${idPrefix}-due`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <div className="row quick-dates">
          <button type="button" className="link-btn" onClick={() => setDue(now)}>
            Today
          </button>
          <button type="button" className="link-btn" onClick={() => setDue(addDays(now, 1))}>
            Tomorrow
          </button>
          <button type="button" className="link-btn" onClick={() => setDue(addDays(now, 7))}>
            In a week
          </button>
          {due && (
            <button type="button" className="link-btn" onClick={() => setDue('')}>
              No date
            </button>
          )}
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${idPrefix}-priority`}>
          Priority
        </label>
        <select id={`${idPrefix}-priority`} value={priority} onChange={(e) => setPriority(e.target.value as TodoPriority)}>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {setTripId && trips.length > 0 && (
        <div className="field full">
          <label className="field-label" htmlFor={`${idPrefix}-trip`}>
            Trip
          </label>
          <select id={`${idPrefix}-trip`} value={tripId ?? ''} onChange={(e) => setTripId(e.target.value)}>
            <option value="">None</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

/** Quick add. Inside a trip, `tripId` fixes the trip and hides the picker. */
export function AddTodo({ tripId }: { tripId?: string }) {
  const { addTodo } = useAdminContext()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState<TodoPriority>('normal')
  const [trip, setTrip] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const ok = await addTodo({ title: title.trim(), due_date: due || null, priority, trip_id: tripId ?? (trip || null) })
    if (ok) {
      setTitle('')
      setDue('')
      setPriority('normal')
    }
  }

  return (
    <form onSubmit={submit}>
      <TodoFields
        idPrefix={tripId ? `todo-${tripId}` : 'todo'}
        title={title}
        setTitle={setTitle}
        due={due}
        setDue={setDue}
        priority={priority}
        setPriority={setPriority}
        tripId={trip}
        setTripId={tripId ? undefined : setTrip}
      />
      <div className="actions">
        <button type="submit" className="btn stamp" disabled={!title.trim()}>
          Add to-do
        </button>
      </div>
    </form>
  )
}

function EditTodo({ todo, onClose, inTrip }: { todo: Todo; onClose: () => void; inTrip: boolean }) {
  const { updateTodo, removeTodo } = useAdminContext()
  const [title, setTitle] = useState(todo.title)
  const [due, setDue] = useState(todo.due_date ?? '')
  const [priority, setPriority] = useState(todo.priority)
  const [trip, setTrip] = useState(todo.trip_id ?? '')
  const [notes, setNotes] = useState(todo.notes)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const ok = await updateTodo(todo.id, { title: title.trim(), due_date: due || null, priority, notes: notes.trim(), trip_id: inTrip ? todo.trip_id : trip || null })
    if (ok) onClose()
  }

  return (
    <form className="todo-edit" onSubmit={submit}>
      <TodoFields idPrefix={`edit-${todo.id}`} title={title} setTitle={setTitle} due={due} setDue={setDue} priority={priority} setPriority={setPriority} tripId={trip} setTripId={inTrip ? undefined : setTrip} />
      <div className="field prose">
        <label className="field-label" htmlFor={`edit-${todo.id}-notes`}>
          Notes
        </label>
        <textarea id={`edit-${todo.id}-notes`} className="input prose" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} />
      </div>
      <div className="actions">
        <button type="submit" className="btn sm" disabled={!title.trim()}>
          Save
        </button>
        <button type="button" className="btn secondary sm" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="link-btn danger" onClick={() => confirm(`Delete "${todo.title}"?`) && removeTodo(todo.id)}>
          Delete
        </button>
      </div>
    </form>
  )
}

export function TodoList({ todos, inTrip = false }: { todos: Todo[]; inTrip?: boolean }) {
  const { toggleTodo, trips } = useAdminContext()
  const [editing, setEditing] = useState<string | null>(null)
  const tripName = new Map(trips.map((t) => [t.id, t.name]))

  return (
    <ul className="checklist">
      {todos.map((t) =>
        editing === t.id ? (
          <li key={t.id} className="editing">
            <EditTodo todo={t} inTrip={inTrip} onClose={() => setEditing(null)} />
          </li>
        ) : (
          <li key={t.id}>
            <div className="todo-main">
              <label className={t.done_at ? 'done' : ''}>
                <input type="checkbox" checked={!!t.done_at} onChange={() => toggleTodo(t)} />
                {t.title}
              </label>
              {t.notes && <p className="todo-notes">{t.notes}</p>}
            </div>
            <div className="row">
              {t.priority === 'high' && !t.done_at && <span className="badge accent">High</span>}
              {t.priority === 'low' && !t.done_at && <span className="tag">Low</span>}
              {!inTrip && t.trip_id && tripName.has(t.trip_id) && (
                <Link className="tag" to={`/admin/trips/${t.trip_id}`}>
                  {tripName.get(t.trip_id)}
                </Link>
              )}
              {t.due_date && !t.done_at && <DueBadge due={t.due_date} />}
              <button type="button" className="link-btn" onClick={() => setEditing(t.id)}>
                Edit
              </button>
            </div>
          </li>
        ),
      )}
    </ul>
  )
}
