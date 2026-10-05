import { useState, type FormEvent } from 'react'
import type { NewTrip } from '../../hooks/useAdmin'
import type { Trip } from '../../types'

/** Add or edit a trip's name, destination, dates and budget. */
export default function TripForm({ trip, submitLabel, onSubmit, onCancel }: { trip?: Trip; submitLabel: string; onSubmit: (t: NewTrip & { notes?: string }) => Promise<boolean>; onCancel?: () => void }) {
  const [name, setName] = useState(trip?.name ?? '')
  const [destination, setDestination] = useState(trip?.destination ?? '')
  const [start, setStart] = useState(trip?.start_date ?? '')
  const [end, setEnd] = useState(trip?.end_date ?? '')
  const [budget, setBudget] = useState(trip?.budget != null ? String(trip.budget) : '')
  const [notes, setNotes] = useState(trip?.notes ?? '')
  const badDates = !!start && !!end && end < start
  const valid = !!name.trim() && !badDates && (budget === '' || Number(budget) >= 0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    const ok = await onSubmit({
      name: name.trim(),
      destination: destination.trim(),
      start_date: start || null,
      end_date: end || null,
      budget: budget === '' ? null : Number(budget),
      ...(trip ? { notes: notes.trim() } : {}),
    })
    if (ok && !trip) {
      setName('')
      setDestination('')
      setStart('')
      setEnd('')
      setBudget('')
    }
  }

  const id = trip ? `trip-${trip.id}` : 'trip-new'
  return (
    <form onSubmit={submit}>
      <div className="fields-grid">
        <div className="field prose">
          <label className="field-label" htmlFor={`${id}-name`}>
            Trip
          </label>
          <input id={`${id}-name`} placeholder="Summer in Sicily" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </div>
        <div className="field prose">
          <label className="field-label" htmlFor={`${id}-dest`}>
            Destination
          </label>
          <input id={`${id}-dest`} placeholder="Palermo" value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={100} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${id}-start`}>
            From
          </label>
          <input id={`${id}-start`} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${id}-end`}>
            To
          </label>
          <input id={`${id}-end`} type="date" min={start || undefined} value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="field full">
          <label className="field-label" htmlFor={`${id}-budget`}>
            Budget (euro)
          </label>
          <input id={`${id}-budget`} type="number" min="0" step="0.01" inputMode="decimal" placeholder="800" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        {trip && (
          <div className="field prose full">
            <label className="field-label" htmlFor={`${id}-notes`}>
              Notes
            </label>
            <textarea id={`${id}-notes`} className="input prose" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} />
          </div>
        )}
      </div>
      {badDates && <p className="status err">The end date is before the start date.</p>}
      <div className="actions">
        <button type="submit" className={trip ? 'btn sm' : 'btn stamp'} disabled={!valid}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn secondary sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
