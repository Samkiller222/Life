import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTrainingContext } from './context'
import { today } from '../../lib/dates'
import { describeSets, exerciseOrder, lastSets } from '../../lib/training'
import { EmptyState, Panel } from '../../components/Panel'
import type { GymSession } from '../../types'

type SetRow = { reps: string; weight: string }
type Block = { key: number; exercise: string; sets: SetRow[] }

let nextKey = 1
const emptySet = (): SetRow => ({ reps: '', weight: '' })
const newBlock = (exercise = '', sets: SetRow[] = [emptySet()]): Block => ({ key: nextKey++, exercise, sets })
const isBlank = (b: Block) => b.sets.every((s) => !s.reps && !s.weight)

function GymForm({ session }: { session?: GymSession }) {
  const { gym, exercises, exerciseName, saveGym, removeGym } = useTrainingContext()
  const navigate = useNavigate()
  const [date, setDate] = useState(session?.date ?? today())
  const [name, setName] = useState(session?.name ?? '')
  const [duration, setDuration] = useState(session?.duration_min ? String(session.duration_min) : '')
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [blocks, setBlocks] = useState<Block[]>(() =>
    session && session.sets.length
      ? exerciseOrder(session.sets).map((id) =>
          newBlock(
            exerciseName.get(id) ?? '',
            session.sets.filter((s) => s.exercise_id === id).map((s) => ({ reps: String(s.reps), weight: s.weight_kg ? String(s.weight_kg) : '' })),
          ),
        )
      : [newBlock()],
  )
  const [saving, setSaving] = useState(false)

  const idByName = new Map(exercises.map((e) => [e.name.toLowerCase(), e.id]))
  const previous = (exercise: string) => {
    const id = idByName.get(exercise.trim().toLowerCase())
    return id ? lastSets(gym, id, date, session?.id) : []
  }

  const update = (key: number, change: (b: Block) => Block) => setBlocks((bs) => bs.map((b) => (b.key === key ? change(b) : b)))

  // Prefill an untouched exercise with last time's sets.
  function prefill(b: Block) {
    const last = previous(b.exercise)
    if (!last.length || !isBlank(b)) return
    update(b.key, (x) => ({ ...x, sets: last.map((s) => ({ reps: String(s.reps), weight: s.weight_kg ? String(s.weight_kg) : '' })) }))
  }

  const sets = blocks.flatMap((b) =>
    b.exercise.trim()
      ? b.sets.filter((s) => s.reps !== '').map((s) => ({ exercise: b.exercise.trim(), reps: Number(s.reps), weight_kg: Number(s.weight) || 0 }))
      : [],
  )
  const valid = date && sets.length > 0 && sets.every((s) => Number.isInteger(s.reps) && s.reps >= 0 && s.weight_kg >= 0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    const ok = await saveGym({ id: session?.id, date, name: name.trim(), duration_min: Number(duration) > 0 ? Math.round(Number(duration)) : null, notes: notes.trim(), sets })
    setSaving(false)
    if (ok) navigate('/training')
  }

  return (
    <form onSubmit={submit}>
      <div className="grid">
        <Panel title={session ? 'Edit gym session' : 'Log a gym session'}>
          <div className="fields-grid">
            <div className="field">
              <label className="field-label" htmlFor="gym-date">
                Date
              </label>
              <input id="gym-date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="gym-duration">
                Minutes
              </label>
              <input id="gym-duration" type="number" min="1" inputMode="numeric" placeholder="60" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="field prose full">
              <label className="field-label" htmlFor="gym-name">
                Name
              </label>
              <input id="gym-name" placeholder="Push day" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field prose full">
              <label className="field-label" htmlFor="gym-notes">
                Notes
              </label>
              <input id="gym-notes" placeholder="How it felt" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </Panel>

        <Panel title="Exercises" meta={<span className="tag">{sets.length} sets</span>}>
          <datalist id="exercise-names">
            {exercises.map((e) => (
              <option key={e.id} value={e.name} />
            ))}
          </datalist>
          <div className="exercise-list">
            {blocks.map((b, i) => {
              const last = previous(b.exercise)
              return (
                <fieldset key={b.key} className="exercise">
                  <div className="row">
                    <input
                      className="input prose"
                      style={{ flex: '1 1 160px', width: 'auto' }}
                      list="exercise-names"
                      placeholder="Exercise, like Bench press"
                      aria-label={`Exercise ${i + 1}`}
                      value={b.exercise}
                      onChange={(e) => update(b.key, (x) => ({ ...x, exercise: e.target.value }))}
                      onBlur={() => prefill(b)}
                    />
                    {blocks.length > 1 && (
                      <button type="button" className="link-btn danger" onClick={() => setBlocks((bs) => bs.filter((x) => x.key !== b.key))}>
                        Remove
                      </button>
                    )}
                  </div>
                  {last.length > 0 && <div className="hint">Last time: {describeSets(last)}</div>}
                  <table className="sets">
                    <thead>
                      <tr>
                        <th>Set</th>
                        <th>Reps</th>
                        <th>kg</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {b.sets.map((s, j) => (
                        <tr key={j}>
                          <td className="muted">{j + 1}</td>
                          <td>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              aria-label={`Set ${j + 1} reps`}
                              value={s.reps}
                              onChange={(e) => update(b.key, (x) => ({ ...x, sets: x.sets.map((y, k) => (k === j ? { ...y, reps: e.target.value } : y)) }))}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              type="number"
                              min="0"
                              step="any"
                              inputMode="decimal"
                              aria-label={`Set ${j + 1} weight in kg`}
                              value={s.weight}
                              onChange={(e) => update(b.key, (x) => ({ ...x, sets: x.sets.map((y, k) => (k === j ? { ...y, weight: e.target.value } : y)) }))}
                            />
                          </td>
                          <td>
                            {b.sets.length > 1 && (
                              <button type="button" className="link-btn danger" aria-label={`Remove set ${j + 1}`} onClick={() => update(b.key, (x) => ({ ...x, sets: x.sets.filter((_, k) => k !== j) }))}>
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button type="button" className="link-btn" onClick={() => update(b.key, (x) => ({ ...x, sets: [...x.sets, { ...(x.sets.at(-1) ?? emptySet()) }] }))}>
                    Add set
                  </button>
                </fieldset>
              )
            })}
          </div>
          <div className="actions">
            <button type="button" className="btn secondary sm" onClick={() => setBlocks((bs) => [...bs, newBlock()])}>
              Add exercise
            </button>
          </div>
        </Panel>
      </div>
      <div className="actions">
        <button type="submit" className="btn stamp" disabled={!valid || saving}>
          {saving ? 'Saving…' : session ? 'Save changes' : 'Save session'}
        </button>
        {session && (
          <button
            type="button"
            className="link-btn danger"
            onClick={async () => {
              if (!confirm('Delete this gym session?')) return
              await removeGym(session.id)
              navigate('/training')
            }}
          >
            Delete session
          </button>
        )}
      </div>
    </form>
  )
}

export default function LogGym() {
  const { id } = useParams()
  const { gym } = useTrainingContext()
  if (!id) return <GymForm key="new" />
  const session = gym.find((s) => s.id === id)
  if (!session)
    return (
      <Panel title="Gym session">
        <EmptyState>
          This session isn't in the last year of training. <Link to="/training/history">See history</Link>.
        </EmptyState>
      </Panel>
    )
  return <GymForm key={id} session={session} />
}
