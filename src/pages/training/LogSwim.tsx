import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTrainingContext } from './context'
import { today } from '../../lib/dates'
import { swimPace } from '../../lib/training'
import { EmptyState, Panel } from '../../components/Panel'
import type { SwimSession } from '../../types'

function SwimForm({ swim }: { swim?: SwimSession }) {
  const { saveSwim, removeSwim } = useTrainingContext()
  const navigate = useNavigate()
  const [date, setDate] = useState(swim?.date ?? today())
  const [distance, setDistance] = useState(swim ? String(swim.distance_m) : '')
  const [duration, setDuration] = useState(swim?.duration_min ? String(swim.duration_min) : '')
  const [focus, setFocus] = useState(swim?.focus ?? '')
  const [notes, setNotes] = useState(swim?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const metres = Number(distance)
  const minutes = Number(duration) > 0 ? Number(duration) : null
  const valid = date && Number.isInteger(metres) && metres > 0
  const pace = valid ? swimPace(metres, minutes) : ''

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    const ok = await saveSwim({ id: swim?.id, date, distance_m: metres, duration_min: minutes, focus: focus.trim(), notes: notes.trim() })
    setSaving(false)
    if (ok) navigate('/training')
  }

  return (
    <Panel title={swim ? 'Edit swim' : 'Log a swim'} meta={pace && <span className="tag">{pace}</span>}>
      <form onSubmit={submit}>
        <div className="fields-grid">
          <div className="field">
            <label className="field-label" htmlFor="swim-date">
              Date
            </label>
            <input id="swim-date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="swim-distance">
              Metres
            </label>
            <input id="swim-distance" type="number" min="1" step="1" inputMode="numeric" placeholder="2400" value={distance} onChange={(e) => setDistance(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="swim-duration">
              Minutes
            </label>
            <input id="swim-duration" type="number" min="1" step="any" inputMode="decimal" placeholder="45" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="field prose">
            <label className="field-label" htmlFor="swim-focus">
              Focus
            </label>
            <input id="swim-focus" placeholder="Threshold, technique" value={focus} onChange={(e) => setFocus(e.target.value)} />
          </div>
          <div className="field prose full">
            <label className="field-label" htmlFor="swim-notes">
              Notes
            </label>
            <input id="swim-notes" placeholder="Main set, how it felt" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="actions">
          <button type="submit" className="btn stamp" disabled={!valid || saving}>
            {saving ? 'Saving…' : swim ? 'Save changes' : 'Save swim'}
          </button>
          {swim && (
            <button
              type="button"
              className="link-btn danger"
              onClick={async () => {
                if (!confirm('Delete this swim?')) return
                await removeSwim(swim.id)
                navigate('/training')
              }}
            >
              Delete swim
            </button>
          )}
        </div>
      </form>
    </Panel>
  )
}

export default function LogSwim() {
  const { id } = useParams()
  const { swims } = useTrainingContext()
  if (!id) return <SwimForm key="new" />
  const swim = swims.find((s) => s.id === id)
  if (!swim)
    return (
      <Panel title="Swim">
        <EmptyState>
          This swim isn't in the last year of training. <Link to="/training/history">See history</Link>.
        </EmptyState>
      </Panel>
    )
  return <SwimForm key={id} swim={swim} />
}
