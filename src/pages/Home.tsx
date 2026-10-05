import { Link } from 'react-router-dom'
import { modules } from '../modules'
import { supabase } from '../lib/supabase'

export default function Home() {
  return (
    <>
      <h1>Life dashboard</h1>
      {!supabase && (
        <p className="notice">
          Supabase isn't connected yet. Copy <code>.env.example</code> to <code>.env.local</code> and add your
          project URL and anon key.
        </p>
      )}
      <div className="cards">
        {modules.map((m, i) => (
          <Link key={m.path} to={m.path} className="card">
            <span className="phase">Phase {i + 1}</span>
            <h2>{m.name}</h2>
            <p>{m.summary}</p>
            <span className={m.ready ? 'badge ready' : m.built ? 'badge built' : 'badge'}>
              {m.ready ? 'Done' : m.built ? 'Built, testing' : 'Not built yet'}
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}
