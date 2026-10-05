import { Link } from 'react-router-dom'
import { modules } from '../modules'
import { supabase } from '../lib/supabase'
import { Panel } from '../components/Panel'

function statusBadge(built: boolean, ready: boolean) {
  if (ready) return <span className="badge ok">Done</span>
  if (built) return <span className="badge accent">Testing</span>
  return <span className="badge">Not built</span>
}

export default function Home() {
  const built = modules.filter((m) => m.built).length
  return (
    <>
      {!supabase && (
        <Panel title="Connect Supabase" meta={<span className="badge warn">Setup</span>}>
          <p>
            Copy <code>.env.example</code> to <code>.env.local</code> and add your project URL and anon key. The README
            has the full steps.
          </p>
        </Panel>
      )}
      <Panel title="Modules" meta={<span className="tag">{built} of {modules.length} built</span>}>
        <div className="module-list">
          {modules.map((m, i) => (
            <Link key={m.path} to={m.path} className="module-row">
              <div>
                <span className="phase-num">Phase {i + 1}</span>
                <strong>{m.name}</strong>
                <span className="desc">{m.summary}</span>
              </div>
              {statusBadge(m.built, m.ready)}
            </Link>
          ))}
        </div>
      </Panel>
    </>
  )
}
