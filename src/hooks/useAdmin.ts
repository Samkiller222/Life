import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { KEEP_DONE_DAYS } from '../lib/admin'
import { addDays, parseISODate, today } from '../lib/dates'
import type { Book, BookStatus, Todo, Trip, TripCost, TripItem } from '../types'

const TODO_COLS = 'id, title, notes, due_date, priority, done_at, trip_id, created_at'
const BOOK_COLS = 'id, title, author, status, started_on, finished_on, rating, notes, created_at'
const TRIP_COLS = 'id, name, destination, start_date, end_date, budget, notes'

async function fetchAll() {
  const empty = { error: '', todos: [] as Todo[], books: [] as Book[], trips: [] as Trip[], items: [] as TripItem[], costs: [] as TripCost[] }
  if (!supabase) return empty
  // Open to-dos plus those finished recently, so long-done ones don't pile up.
  const since = parseISODate(addDays(today(), -KEEP_DONE_DAYS)).toISOString()
  const [t, b, tr, i, c] = await Promise.all([
    supabase.from('admin_todos').select(TODO_COLS).or(`done_at.is.null,done_at.gte.${since}`).order('created_at'),
    supabase.from('admin_books').select(BOOK_COLS).order('created_at'),
    supabase.from('admin_trips').select(TRIP_COLS).order('start_date', { nullsFirst: false }),
    supabase.from('admin_trip_items').select('id, trip_id, title, done, position').order('position').order('created_at'),
    supabase.from('admin_trip_costs').select('id, trip_id, description, category, amount').order('created_at'),
  ])
  return {
    error: (t.error ?? b.error ?? tr.error ?? i.error ?? c.error)?.message ?? '',
    todos: (t.data ?? []) as Todo[],
    books: (b.data ?? []) as Book[],
    trips: (tr.data ?? []) as Trip[],
    items: (i.data ?? []) as TripItem[],
    costs: ((c.data ?? []) as TripCost[]).map((x) => ({ ...x, amount: Number(x.amount) })),
  }
}

export type NewTodo = Pick<Todo, 'title' | 'due_date' | 'priority'> & Partial<Pick<Todo, 'notes' | 'trip_id'>>
export type NewTrip = Pick<Trip, 'name' | 'destination' | 'start_date' | 'end_date' | 'budget'>

export function useAdmin() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [items, setItems] = useState<TripItem[]>([])
  const [costs, setCosts] = useState<TripCost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const apply = useCallback((r: Awaited<ReturnType<typeof fetchAll>>) => {
    if (r.error) setError(r.error)
    else {
      setTodos(r.todos)
      setBooks(r.books)
      setTrips(r.trips.map((x) => ({ ...x, budget: x.budget === null ? null : Number(x.budget) })))
      setItems(r.items)
      setCosts(r.costs)
    }
  }, [])

  useEffect(() => {
    fetchAll().then((r) => {
      apply(r)
      setLoading(false)
    })
  }, [apply])

  const load = () => fetchAll().then(apply)

  function fail(e: { message: string } | null) {
    setError(e ? e.message : '')
    return !e
  }

  // To-dos

  async function addTodo(t: NewTodo) {
    if (!supabase) return false
    const ok = fail((await supabase.from('admin_todos').insert(t)).error)
    await load()
    return ok
  }

  async function updateTodo(id: string, patch: Partial<Pick<Todo, 'title' | 'notes' | 'due_date' | 'priority' | 'trip_id'>>) {
    if (!supabase) return false
    const ok = fail((await supabase.from('admin_todos').update(patch).eq('id', id)).error)
    await load()
    return ok
  }

  async function toggleTodo(todo: Todo) {
    if (!supabase) return
    const done_at = todo.done_at ? null : new Date().toISOString()
    // Tick straight away so the list feels instant; the reload confirms it.
    setTodos((list) => list.map((t) => (t.id === todo.id ? { ...t, done_at } : t)))
    fail((await supabase.from('admin_todos').update({ done_at }).eq('id', todo.id)).error)
    await load()
  }

  async function removeTodo(id: string) {
    if (!supabase) return
    fail((await supabase.from('admin_todos').delete().eq('id', id)).error)
    await load()
  }

  // Books

  async function addBook(b: Pick<Book, 'title' | 'author' | 'status'>) {
    if (!supabase) return false
    const date = today()
    const ok = fail(
      (await supabase.from('admin_books').insert({
        ...b,
        started_on: b.status === 'want' ? null : date,
        finished_on: b.status === 'finished' ? date : null,
      })).error,
    )
    await load()
    return ok
  }

  /** Moves a book to another list, stamping the start or finish date. */
  async function moveBook(book: Book, status: BookStatus) {
    if (!supabase) return
    const date = today()
    const patch: Partial<Book> = { status }
    if (status === 'want') Object.assign(patch, { started_on: null, finished_on: null, rating: null })
    if (status === 'reading') Object.assign(patch, { started_on: book.started_on ?? date, finished_on: null })
    if (status === 'finished') Object.assign(patch, { started_on: book.started_on ?? date, finished_on: date })
    fail((await supabase.from('admin_books').update(patch).eq('id', book.id)).error)
    await load()
  }

  async function updateBook(id: string, patch: Partial<Pick<Book, 'title' | 'author' | 'rating' | 'notes'>>) {
    if (!supabase) return
    fail((await supabase.from('admin_books').update(patch).eq('id', id)).error)
    await load()
  }

  async function removeBook(id: string) {
    if (!supabase) return
    fail((await supabase.from('admin_books').delete().eq('id', id)).error)
    await load()
  }

  // Trips

  async function addTrip(t: NewTrip): Promise<string | null> {
    if (!supabase) return null
    const { data, error } = await supabase.from('admin_trips').insert(t).select('id').single()
    fail(error)
    await load()
    return (data?.id as string) ?? null
  }

  async function updateTrip(id: string, patch: Partial<Omit<Trip, 'id'>>) {
    if (!supabase) return false
    const ok = fail((await supabase.from('admin_trips').update(patch).eq('id', id)).error)
    await load()
    return ok
  }

  async function removeTrip(id: string) {
    if (!supabase) return
    fail((await supabase.from('admin_trips').delete().eq('id', id)).error)
    await load()
  }

  async function addItems(tripId: string, titles: string[]) {
    if (!supabase || !titles.length) return
    const start = Math.max(0, ...items.filter((i) => i.trip_id === tripId).map((i) => i.position)) + 1
    fail((await supabase.from('admin_trip_items').insert(titles.map((title, k) => ({ trip_id: tripId, title, position: start + k })))).error)
    await load()
  }

  async function toggleItem(item: TripItem) {
    if (!supabase) return
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
    fail((await supabase.from('admin_trip_items').update({ done: !item.done }).eq('id', item.id)).error)
    await load()
  }

  async function removeItem(id: string) {
    if (!supabase) return
    fail((await supabase.from('admin_trip_items').delete().eq('id', id)).error)
    await load()
  }

  async function addCost(c: Omit<TripCost, 'id'>) {
    if (!supabase) return false
    const ok = fail((await supabase.from('admin_trip_costs').insert(c)).error)
    await load()
    return ok
  }

  async function removeCost(id: string) {
    if (!supabase) return
    fail((await supabase.from('admin_trip_costs').delete().eq('id', id)).error)
    await load()
  }

  return {
    todos,
    books,
    trips,
    items,
    costs,
    loading,
    error,
    addTodo,
    updateTodo,
    toggleTodo,
    removeTodo,
    addBook,
    moveBook,
    updateBook,
    removeBook,
    addTrip,
    updateTrip,
    removeTrip,
    addItems,
    toggleItem,
    removeItem,
    addCost,
    removeCost,
  }
}
