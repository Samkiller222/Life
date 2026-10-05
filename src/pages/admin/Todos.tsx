import { useAdminContext } from './context'
import { AddTodo, TodoList } from './TodoParts'
import { groupTodos, recentlyDone } from '../../lib/admin'
import { today } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'

export default function Todos() {
  const { todos } = useAdminContext()
  const now = today()
  const groups = groupTodos(todos, now)
  const done = recentlyDone(todos, now)

  return (
    <div className="grid">
      <Panel title="Add a to-do">
        <AddTodo />
      </Panel>
      {groups.length === 0 && (
        <Panel title="To-dos">
          <EmptyState>To-dos you add will appear here, grouped by deadline: overdue, today, this week, later and no date.</EmptyState>
        </Panel>
      )}
      {groups.map((g) => (
        <Panel key={g.key} title={g.label} meta={<span className={g.key === 'overdue' ? 'badge err' : 'tag'}>{g.todos.length}</span>}>
          <TodoList todos={g.todos} />
        </Panel>
      ))}
      {done.length > 0 && (
        <Panel title="Done this week" meta={<span className="badge ok">{done.length}</span>}>
          <TodoList todos={done} />
          <p className="hint">Finished to-dos drop off after a week.</p>
        </Panel>
      )}
    </div>
  )
}
