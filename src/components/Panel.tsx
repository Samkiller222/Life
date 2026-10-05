import type { ReactNode } from 'react'
import logo from '../assets/logo.png'

export function Panel({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {meta && <div className="panel-meta">{meta}</div>}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <img className="mark" src={logo} alt="" />
      {children}
    </div>
  )
}
