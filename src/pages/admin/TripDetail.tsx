import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAdminContext } from './context'
import TripForm from './TripForm'
import { AddTodo, TodoList } from './TodoParts'
import { STARTER_TRIP_ITEMS, compareTodos, tripDates, tripSpending, tripWhen } from '../../lib/admin'
import { formatMoney } from '../../lib/money'
import { today } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'
import type { Trip } from '../../types'

function Checklist({ trip }: { trip: Trip }) {
  const { items, addItems, toggleItem, removeItem } = useAdminContext()
  const [text, setText] = useState('')
  const list = items.filter((i) => i.trip_id === trip.id)
  const done = list.filter((i) => i.done).length

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    // One item per line, so a pasted list adds in one go.
    const titles = text.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!titles.length) return
    await addItems(trip.id, titles)
    setText('')
  }

  return (
    <Panel title="Checklist" meta={<span className={list.length && done === list.length ? 'badge ok' : 'tag'}>{done} of {list.length} done</span>}>
      {list.length === 0 ? (
        <EmptyState>
          Things to pack and book will appear here.{' '}
          <button type="button" className="link-btn" onClick={() => addItems(trip.id, STARTER_TRIP_ITEMS)}>
            Start with a basic list
          </button>
        </EmptyState>
      ) : (
        <ul className="checklist">
          {list.map((i) => (
            <li key={i.id}>
              <label className={i.done ? 'done' : ''}>
                <input type="checkbox" checked={i.done} onChange={() => toggleItem(i)} />
                {i.title}
              </label>
              <button type="button" className="link-btn danger" onClick={() => removeItem(i.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="actions" onSubmit={submit}>
        <textarea
          className="input prose"
          style={{ flex: '1 1 220px', width: 'auto' }}
          rows={1}
          placeholder="Add an item, or paste a list with one per line"
          aria-label="New checklist items"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e)
          }}
        />
        <button type="submit" className="btn sm" disabled={!text.trim()}>
          Add
        </button>
      </form>
    </Panel>
  )
}

function Costs({ trip }: { trip: Trip }) {
  const { costs, addCost, removeCost } = useAdminContext()
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const list = costs.filter((c) => c.trip_id === trip.id)
  const s = tripSpending(list)
  const categories = [...new Set(costs.map((c) => c.category.trim()).filter(Boolean))].sort()
  const pct = trip.budget ? Math.min(100, Math.round((s.total / trip.budget) * 100)) : 0
  const over = trip.budget != null && s.total > trip.budget
  const valid = !!description.trim() && Number(amount) > 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    if (await addCost({ trip_id: trip.id, description: description.trim(), category: category.trim(), amount: Number(amount) })) {
      setDescription('')
      setAmount('')
    }
  }

  return (
    <Panel title="Costs" meta={over ? <span className="badge err">Over budget</span> : undefined}>
      <div className="stat-head">
        <strong>{formatMoney(s.total)} spent</strong>
        <span className="stat-count">
          {trip.budget != null ? (over ? `${formatMoney(s.total - trip.budget)} over ${formatMoney(trip.budget)}` : `${formatMoney(trip.budget - s.total)} left of ${formatMoney(trip.budget)}`) : 'No budget set'}
        </span>
      </div>
      {trip.budget ? (
        <div className="stat-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
          <div className={`stat-fill ${over ? 'over' : pct >= 90 ? 'warn' : 'done'}`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {s.byCategory.length > 1 && (
        <dl className="totals cost-split">
          {s.byCategory.map((c) => (
            <div key={c.category}>
              <dt>{c.category}</dt>
              <dd>{formatMoney(c.amount)}</dd>
            </div>
          ))}
        </dl>
      )}
      {list.length === 0 ? (
        <EmptyState>Bookings and spending you add will appear here and count against the budget.</EmptyState>
      ) : (
        <ul className="tx-list cost-list">
          {list.map((c) => (
            <li key={c.id}>
              <div className="tx-main">
                <span className="tx-desc">{c.description}</span>
                {c.category && <span className="muted">{c.category}</span>}
              </div>
              <div className="row">
                <span className="tx-amount">{formatMoney(c.amount)}</span>
                <button type="button" className="link-btn danger" onClick={() => removeCost(c.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="cost-add">
        <div className="fields-grid">
          <div className="field prose full">
            <label className="field-label" htmlFor="cost-desc">
              What
            </label>
            <input id="cost-desc" placeholder="Flights" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
          </div>
          <div className="field prose">
            <label className="field-label" htmlFor="cost-cat">
              Category
            </label>
            <input id="cost-cat" list="cost-categories" placeholder="Travel" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} />
            <datalist id="cost-categories">
              {[...new Set([...categories, 'Travel', 'Stay', 'Food', 'Activities'])].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="cost-amount">
              Amount (euro)
            </label>
            <input id="cost-amount" type="number" min="0" step="0.01" inputMode="decimal" placeholder="120" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <div className="actions">
          <button type="submit" className="btn sm" disabled={!valid}>
            Add cost
          </button>
        </div>
      </form>
    </Panel>
  )
}

export default function TripDetail() {
  const { id } = useParams()
  const { trips, todos, updateTrip, removeTrip } = useAdminContext()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const trip = trips.find((t) => t.id === id)

  if (!trip) {
    return (
      <Panel title="Trip not found">
        <EmptyState>
          This trip may have been deleted. <Link to="/admin/trips">Back to trips</Link>
        </EmptyState>
      </Panel>
    )
  }

  const tripTodos = todos.filter((t) => t.trip_id === trip.id).sort((a, b) => Number(!!a.done_at) - Number(!!b.done_at) || compareTodos(a, b))

  return (
    <div className="grid">
      <Panel title={trip.name} meta={<span className="tag">{tripWhen(trip, today())}</span>}>
        {editing ? (
          <TripForm
            trip={trip}
            submitLabel="Save trip"
            onCancel={() => setEditing(false)}
            onSubmit={async (patch) => {
              const ok = await updateTrip(trip.id, patch)
              if (ok) setEditing(false)
              return ok
            }}
          />
        ) : (
          <>
            <p className="muted">{[trip.destination, tripDates(trip)].filter(Boolean).join(' · ') || 'No destination or dates yet.'}</p>
            {trip.notes && <p className="todo-notes">{trip.notes}</p>}
            <div className="actions">
              <Link to="/admin/trips" className="link-btn">
                All trips
              </Link>
              <button type="button" className="link-btn" onClick={() => setEditing(true)}>
                Edit trip
              </button>
              <button
                type="button"
                className="link-btn danger"
                onClick={async () => {
                  if (!confirm(`Delete "${trip.name}" with its checklist, costs and to-dos?`)) return
                  await removeTrip(trip.id)
                  navigate('/admin/trips')
                }}
              >
                Delete trip
              </button>
            </div>
          </>
        )}
      </Panel>
      <Checklist trip={trip} />
      <Costs trip={trip} />
      <Panel title="To-dos for this trip">
        {tripTodos.length === 0 ? <EmptyState>To-dos for this trip will appear here and on your main to-do list.</EmptyState> : <TodoList todos={tripTodos} inTrip />}
        <div className="cost-add">
          <AddTodo tripId={trip.id} />
        </div>
      </Panel>
    </div>
  )
}
