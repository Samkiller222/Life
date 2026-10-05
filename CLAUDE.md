# Life dashboard

One personal web app that tracks habits, training, money and life admin, built up one module at a time.

## Stack

- React 19 + TypeScript, built with Vite
- React Router for pages
- Supabase for the database and logins (`src/lib/supabase.ts`)
- Hosted on GitHub Pages at https://samkiller222.github.io/Life/, built and deployed by `.github/workflows/deploy.yml` (base path `/Life/` via `BASE_PATH`). `vercel.json` is kept in case it moves to Vercel.
- Code on GitHub: `Samkiller222/Life`

Same stack as the planned swim training platform, so there is only one setup to learn.

## Phases

Build in order. Finish and test each phase's "Done when" check before starting the next.
Module metadata (name, summary, "Done when", `ready` flag) lives in `src/modules.ts`.

1. **Habits and goals**: daily check-ins for habits you define, with streaks and weekly summaries; goals with progress bars and target dates. Done when: used daily for a week without friction.
2. **Training hub**: log gym sessions (exercises, sets, reps, weight); pull in swim data from the swim platform. Done when: a week of swim and gym training shows on one screen.
3. **Money**: import bank CSV exports, auto-categorise spending with rules; monthly budgets per category and savings goals. Done when: a month of real transactions imports and categorises correctly.
4. **Life admin**: to-dos with deadlines, a reading list, trip planning with checklists and budgets. Done when: it replaces the current notes app for these.
5. **Smart layer**: a weekly AI review that summarises the week, spots patterns across modules, and suggests next week's focus.

Current status: Phases 1 (habits and goals), 2 (training hub), 3 (money) and 4 (life admin) are built and awaiting their "Done when" checks. Phase 5 is a placeholder.
Phase 1 lives in `src/pages/habits/`, `src/hooks/`, `src/lib/streak.ts` and `supabase/migrations/20261005120000_habits_and_goals.sql`.
Phase 2 lives in `src/pages/training/`, `src/hooks/useTraining.ts`, `src/lib/training.ts` and `supabase/migrations/20261005180000_training_hub.sql`. There is no swim platform yet, so swims are logged by hand; `training_swim_sessions.source` and `external_id` let the platform feed the same table later.
Phase 3 lives in `src/pages/money/`, `src/hooks/useMoney.ts`, `src/lib/money.ts`, `src/lib/csv.ts` and `supabase/migrations/20261005200000_money.sql`. The importer reads any bank's CSV: each `money_accounts.csv_format` remembers which columns hold the date, description and amount, and `import_key` stops re-imports duplicating rows. Amounts are euro, negative for money out.
Phase 4 lives in `src/pages/admin/`, `src/hooks/useAdmin.ts`, `src/lib/admin.ts` and `supabase/migrations/20261005220000_life_admin.sql`. To-dos can belong to a trip (`admin_todos.trip_id`) and then show on both the main list and the trip page; deleting a trip deletes its checklist, costs and to-dos. Finished to-dos stay listed for a week.
Migrations are applied to Supabase project `dhpxlmksyctpafcfdpit` ("Samkiller222's Project", shared with other apps, so keep table names module-specific).

## How we work

- One phase per prompt. Propose a short plan (tables, pages, components) and wait for approval before writing code.
- Check the phase's "Done when" line before moving on, then set `ready: true` in `src/modules.ts`.
- Commit after every working step so mistakes are easy to roll back.
- Secrets stay out of the code. The Supabase URL and publishable key are public, so the deploy workflow sets them directly (Sam's choice, 2026-10-05); locally they go in `.env.local` (git-ignored). Never commit the service-role/secret key.

## Conventions

- Pages in `src/pages/`, shared components in `src/components/`, helpers in `src/lib/`.
- Function components and hooks only. Keep components small; one module per folder once a module grows past a page or two (`src/pages/habits/...`).
- Database changes are SQL files in `supabase/migrations/`, named `YYYYMMDDHHMMSS_description.sql`. Every table has `user_id uuid references auth.users` and row-level security so each user sees only their own rows.
- Styling follows the Case Register design system from Claude Design: tokens (colours, type, radii, spacing) live in `src/styles/tokens.css`, component classes in `src/index.css`. Use the tokens, never raw hex values.
- Look: dark ink header with a 4px brass rule, serif titles, system sans for UI, monospace for data, labels, tags and badges. One accent (stamp red) for the main action, links and focus. Status colours are fixed: green ok, brass warn, red error.
- Build screens from `Panel` and `EmptyState` (`src/components/Panel.tsx`). Buttons: `btn` (ink), `btn stamp` (accent, main action), `btn secondary`; `link-btn` for small text actions.
- Copy is plain and sentence case, with no emoji or exclamation marks. Empty states say what will appear and when.
- Theme is light or dark via `data-theme` on `<html>`, toggled in the header and saved in localStorage.
- Before committing: `npm run lint`, `npm test` and `npm run build` must all pass.

## Commands

- `npm install`: install dependencies
- `npm run dev`: run locally at http://localhost:5173
- `npm run build`: type-check and build
- `npm run lint`: lint with oxlint
- `npm test`: unit tests with Vitest
