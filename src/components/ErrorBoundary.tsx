import { Component, type ReactNode } from 'react'

/** Shows what went wrong instead of a blank page if anything throws while rendering. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 16px', fontFamily: 'var(--font-body)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)' }}>Something went wrong</h1>
        <p>The app hit an error while loading. Reload the page, and if it keeps happening, send this message along:</p>
        <pre className="readout" style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
      </div>
    )
  }
}
