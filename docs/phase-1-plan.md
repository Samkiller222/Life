# Phase 1 plan: Habits and goals

Approved and built on 2026-10-05. Remaining: the one-week "Done when" check.

## Login

Supabase email magic-link login. A small `AuthGate` wraps the app: signed out shows a sign-in form, signed in shows the dashboard.

## Database tables (one migration)

| Table | Columns |
|---|---|
| `habits` | id, user_id, name, schedule (daily, or chosen weekdays), archived, created_at |
| `habit_checkins` | id, user_id, habit_id, date, unique (habit_id, date) |
| `goals` | id, user_id, title, unit (e.g. km, books), target_value, current_value, target_date, created_at |
| `goal_updates` | id, user_id, goal_id, value, note, created_at |

Row-level security on all four: users read and write only rows where `user_id = auth.uid()`.

## Pages and components

- **Today** (`/habits`): today's habits as a checklist, one tap to check in, current streak beside each.
- **Week view**: a 7-day grid per habit with a completion percentage, which is the weekly summary.
- **Manage habits**: add, rename, set schedule, archive.
- **Goals** (`/habits/goals`): cards with a progress bar, days left to the target date, and a quick "log progress" input.
- Helpers: `useHabits`, `useGoals` hooks and a `streak()` function with unit tests.

## Done when

You've used it daily for a week without friction.
