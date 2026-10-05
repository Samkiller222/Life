import type { Module } from '../modules'
import { EmptyState, Panel } from '../components/Panel'

export default function ComingSoon({ module }: { module: Module }) {
  return (
    <Panel title={module.name} meta={<span className="badge">Not built</span>}>
      <EmptyState>
        This module will appear here once it's built.
        <br />
        Done when: {module.doneWhen}
      </EmptyState>
    </Panel>
  )
}
