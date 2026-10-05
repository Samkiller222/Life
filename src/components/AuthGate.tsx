import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Panel } from './Panel'

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
      <Panel title="Connect Supabase" meta={<span className="badge warn">Setup</span>}>
        <p>
          Supabase isn't connected yet. Copy <code>.env.example</code> to <code>.env.local</code> and add your project
          URL and anon key.
        </p>
      </Panel>
    )
  }
  if (loading) return <p className="status">Loading…</p>
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
    <div className="grid">
      <Panel title="Sign in">
        {sent ? (
          <p>Check {email} for a sign-in link. You can close this tab once you've opened it.</p>
        ) : (
          <form onSubmit={signIn}>
            <div className="field">
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input id="email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="actions">
              <button type="submit" className="btn stamp">
                Email me a link
              </button>
            </div>
          </form>
        )}
        <div className={error ? 'status err' : 'status'}>{error}</div>
      </Panel>
    </div>
  )
}

export function SignOutButton() {
  if (!supabase) return null
  return (
    <button type="button" className="link-btn" onClick={() => supabase!.auth.signOut()}>
      Sign out
    </button>
  )
}
