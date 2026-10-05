import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/** Shows a magic-link sign-in form until there's a Supabase session. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) {
    return (
      <p className="notice">
        Supabase isn't connected yet. Copy <code>.env.example</code> to <code>.env.local</code> and add your project
        URL and anon key.
      </p>
    )
  }
  if (loading) return <p className="muted">Loading…</p>
  if (session) return <>{children}</>

  async function signIn(e: FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div className="panel narrow">
      <h2>Sign in</h2>
      {sent ? (
        <p>Check {email} for a sign-in link.</p>
      ) : (
        <form onSubmit={signIn} className="row">
          <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit">Email me a link</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}

export function SignOutButton() {
  if (!supabase) return null
  return (
    <button className="link" onClick={() => supabase!.auth.signOut()}>
      Sign out
    </button>
  )
}
