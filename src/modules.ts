// The five modules from the Life dashboard plan, in build order.
// Set `built` when a module's code lands; flip `ready` to true when its "Done when" check passes.
export type Module = {
  path: string
  name: string
  summary: string
  doneWhen: string
  built: boolean
  ready: boolean
}

export const modules: Module[] = [
  {
    path: '/habits',
    name: 'Habits and goals',
    summary: 'Daily habit check-ins with streaks and weekly summaries, plus goals with progress bars and target dates.',
    doneWhen: "You've used it daily for a week without friction.",
    built: true,
    ready: false,
  },
  {
    path: '/training',
    name: 'Training hub',
    summary: 'Log gym sessions and swims so a week of training shows in one place.',
    doneWhen: 'A week of swim and gym training shows on one screen.',
    built: true,
    ready: false,
  },
  {
    path: '/money',
    name: 'Money',
    summary: 'Import bank CSVs, auto-categorise spending with your rules, budgets and savings goals.',
    doneWhen: 'A month of real transactions imports and categorises correctly.',
    built: true,
    ready: false,
  },
  {
    path: '/admin',
    name: 'Life admin',
    summary: 'To-dos with deadlines, a reading list, and trip planning with checklists and budgets.',
    doneWhen: 'It replaces whatever notes app you use now for these.',
    built: false,
    ready: false,
  },
  {
    path: '/review',
    name: 'Smart layer',
    summary: "A weekly AI review that summarises your week, spots patterns and suggests next week's focus.",
    doneWhen: 'It gives a useful weekly summary across the other modules.',
    built: false,
    ready: false,
  },
]
