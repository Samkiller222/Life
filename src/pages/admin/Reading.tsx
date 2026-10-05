import { useState, type FormEvent } from 'react'
import { useAdminContext } from './context'
import { parseISODate } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'
import type { Book, BookStatus } from '../../types'

const SHELVES: { status: BookStatus; title: string; empty: string }[] = [
  { status: 'reading', title: 'Reading now', empty: 'Books you start will appear here.' },
  { status: 'want', title: 'Want to read', empty: 'Books you want to read will appear here.' },
  { status: 'finished', title: 'Finished', empty: 'Books you finish will appear here with the date and your rating.' },
]

const shortDate = (s: string) => parseISODate(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function Stars({ book }: { book: Book }) {
  const { updateBook } = useAdminContext()
  return (
    <div className="stars" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={book.rating && n <= book.rating ? 'star on' : 'star'}
          aria-label={`${n} out of 5`}
          aria-pressed={book.rating === n}
          onClick={() => updateBook(book.id, { rating: book.rating === n ? null : n })}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function BookNotes({ book, onClose }: { book: Book; onClose: () => void }) {
  const { updateBook } = useAdminContext()
  const [notes, setNotes] = useState(book.notes)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        await updateBook(book.id, { notes: notes.trim() })
        onClose()
      }}
    >
      <textarea className="input prose" rows={3} aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} />
      <div className="actions">
        <button type="submit" className="btn sm">
          Save notes
        </button>
        <button type="button" className="btn secondary sm" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function BookRow({ book }: { book: Book }) {
  const { moveBook, removeBook } = useAdminContext()
  const [editing, setEditing] = useState(false)
  const dates =
    book.status === 'finished' && book.finished_on
      ? `Finished ${shortDate(book.finished_on)}`
      : book.status === 'reading' && book.started_on
        ? `Started ${shortDate(book.started_on)}`
        : ''

  return (
    <li>
      <div className="book-main">
        <strong>{book.title}</strong>
        {(book.author || dates) && <span className="muted">{[book.author, dates].filter(Boolean).join(' · ')}</span>}
        {book.notes && !editing && <p className="todo-notes">{book.notes}</p>}
        {editing && <BookNotes book={book} onClose={() => setEditing(false)} />}
      </div>
      <div className="row">
        {book.status === 'finished' && <Stars book={book} />}
        {book.status === 'want' && (
          <button type="button" className="btn sm" onClick={() => moveBook(book, 'reading')}>
            Start reading
          </button>
        )}
        {book.status === 'reading' && (
          <button type="button" className="btn sm" onClick={() => moveBook(book, 'finished')}>
            Finished
          </button>
        )}
        {book.status === 'reading' && (
          <button type="button" className="link-btn" onClick={() => moveBook(book, 'want')}>
            Put back
          </button>
        )}
        {book.status === 'finished' && (
          <button type="button" className="link-btn" onClick={() => moveBook(book, 'reading')}>
            Reading again
          </button>
        )}
        {!editing && (
          <button type="button" className="link-btn" onClick={() => setEditing(true)}>
            Notes
          </button>
        )}
        <button type="button" className="link-btn danger" onClick={() => confirm(`Delete "${book.title}"?`) && removeBook(book.id)}>
          Delete
        </button>
      </div>
    </li>
  )
}

export default function Reading() {
  const { books, addBook } = useAdminContext()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [status, setStatus] = useState<BookStatus>('want')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (await addBook({ title: title.trim(), author: author.trim(), status })) {
      setTitle('')
      setAuthor('')
    }
  }

  const shelf = (s: BookStatus) => {
    const list = books.filter((b) => b.status === s)
    // Newest finished first; the other shelves keep the order you added them.
    return s === 'finished' ? list.sort((a, b) => (b.finished_on ?? '').localeCompare(a.finished_on ?? '')) : list
  }

  return (
    <div className="grid">
      <Panel title="Add a book">
        <form onSubmit={submit}>
          <div className="fields-grid">
            <div className="field prose">
              <label className="field-label" htmlFor="book-title">
                Title
              </label>
              <input id="book-title" placeholder="The Overstory" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div className="field prose">
              <label className="field-label" htmlFor="book-author">
                Author
              </label>
              <input id="book-author" placeholder="Richard Powers" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={200} />
            </div>
            <div className="field full">
              <label className="field-label" htmlFor="book-status">
                List
              </label>
              <select id="book-status" value={status} onChange={(e) => setStatus(e.target.value as BookStatus)}>
                <option value="want">Want to read</option>
                <option value="reading">Reading now</option>
                <option value="finished">Finished</option>
              </select>
            </div>
          </div>
          <div className="actions">
            <button type="submit" className="btn stamp" disabled={!title.trim()}>
              Add book
            </button>
          </div>
        </form>
      </Panel>
      {SHELVES.map((s) => {
        const list = shelf(s.status)
        return (
          <Panel key={s.status} title={s.title} meta={<span className="tag">{list.length}</span>}>
            {list.length === 0 ? (
              <EmptyState>{s.empty}</EmptyState>
            ) : (
              <ul className="book-list">
                {list.map((b) => (
                  <BookRow key={b.id} book={b} />
                ))}
              </ul>
            )}
          </Panel>
        )
      })}
    </div>
  )
}
