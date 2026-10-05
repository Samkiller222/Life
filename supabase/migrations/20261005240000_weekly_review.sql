-- Phase 5: smart layer.
-- One written review per user per week, plus a function that gathers the week's numbers from every module.
-- The review text is written by a weekly Claude routine; the page reads it and shows this week's numbers live.

create table public.review_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- Monday of the week.
  week_start date not null check (extract(isodow from week_start) = 1),
  -- What review_week_stats returned when the review was written.
  stats jsonb not null default '{}'::jsonb,
  summary text not null default '' check (char_length(summary) <= 4000),
  -- Short sentences, as JSON arrays of strings.
  patterns jsonb not null default '[]'::jsonb check (jsonb_typeof(patterns) = 'array'),
  focus jsonb not null default '[]'::jsonb check (jsonb_typeof(focus) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.review_weeks enable row level security;

create policy "Own weekly reviews" on public.review_weeks
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- The week's numbers across habits, goals, training, money and life admin, as one JSON object.
-- Security invoker, so a signed-in user only ever sees their own rows whatever p_user_id says.
-- p_tz decides which day a timestamp (a finished to-do, a goal update) falls on.
create function public.review_week_stats(p_user_id uuid, p_week_start date, p_tz text default 'UTC')
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  wk as (
    select p_week_start as d0,
      p_week_start + 6 as d6,
      date_trunc('month', p_week_start + 6)::date as m0
  ),
  days as (
    select (wk.d0 + i) as d from wk, generate_series(0, 6) i
  ),
  habit_rows as (
    select h.name,
      (select count(*) from days where days.d >= (h.created_at at time zone p_tz)::date
        and extract(dow from days.d)::smallint = any (h.days)) as due,
      (select count(*) from public.habit_checkins c, wk
        where c.habit_id = h.id and c.date between wk.d0 and wk.d6) as done
    from public.habits h
    where h.user_id = p_user_id and not h.archived
  ),
  goal_rows as (
    select g.title, g.unit, g.current_value, g.target_value, g.target_date,
      coalesce((select sum(u.value) from public.goal_updates u, wk
        where u.goal_id = g.id and (u.created_at at time zone p_tz)::date between wk.d0 and wk.d6), 0) as added
    from public.goals g
    where g.user_id = p_user_id
  ),
  gym as (
    select s.id, s.duration_min from public.training_gym_sessions s, wk
    where s.user_id = p_user_id and s.date between wk.d0 and wk.d6
  ),
  swim as (
    select s.distance_m, s.duration_min from public.training_swim_sessions s, wk
    where s.user_id = p_user_id and s.date between wk.d0 and wk.d6
  ),
  tx as (
    select t.date, t.amount, c.name as category, c.kind, c.id as category_id
    from public.money_transactions t
    left join public.money_categories c on c.id = t.category_id
    where t.user_id = p_user_id
      and t.date between (select m0 from wk) and (select d6 from wk)
      and coalesce(c.kind, 'expense') <> 'transfer'
  ),
  todos as (
    select t.title, t.due_date, t.priority, (t.done_at at time zone p_tz)::date as done_on
    from public.admin_todos t
    where t.user_id = p_user_id
  )
  select jsonb_build_object(
    'week_start', (select d0 from wk),
    'week_end', (select d6 from wk),
    'habits', jsonb_build_object(
      'due', (select coalesce(sum(due), 0) from habit_rows),
      'done', (select coalesce(sum(least(done, due)), 0) from habit_rows),
      'items', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'due', due, 'done', done) order by name) from habit_rows), '[]'::jsonb)
    ),
    'goals', coalesce((select jsonb_agg(jsonb_build_object(
      'title', title, 'unit', unit, 'current', current_value, 'target', target_value,
      'target_date', target_date, 'added_this_week', added) order by title) from goal_rows), '[]'::jsonb),
    'training', jsonb_build_object(
      'gym_sessions', (select count(*) from gym),
      'gym_minutes', (select coalesce(sum(duration_min), 0) from gym),
      'gym_sets', (select count(*) from public.training_gym_sets s where s.session_id in (select id from gym)),
      'gym_volume_kg', (select coalesce(sum(s.reps * s.weight_kg), 0) from public.training_gym_sets s where s.session_id in (select id from gym)),
      'swim_sessions', (select count(*) from swim),
      'swim_metres', (select coalesce(sum(distance_m), 0) from swim),
      'swim_minutes', (select coalesce(sum(duration_min), 0) from swim)
    ),
    'money', jsonb_build_object(
      'spent', (select coalesce(-sum(amount), 0) from tx, wk where tx.date >= wk.d0 and tx.amount < 0 and coalesce(tx.kind, 'expense') = 'expense'),
      'income', (select coalesce(sum(amount), 0) from tx, wk where tx.date >= wk.d0 and tx.amount > 0 and tx.kind = 'income'),
      'transactions', (select count(*) from tx, wk where tx.date >= wk.d0),
      'uncategorised', (select count(*) from tx, wk where tx.date >= wk.d0 and tx.category_id is null),
      'top_categories', coalesce((select jsonb_agg(x order by (x->>'spent')::numeric desc) from (
        select jsonb_build_object('category', coalesce(category, 'Uncategorised'), 'spent', -sum(amount)) as x
        from tx, wk where tx.date >= wk.d0 and tx.amount < 0 and coalesce(tx.kind, 'expense') = 'expense'
        group by category order by -sum(amount) desc limit 5) top), '[]'::jsonb),
      -- Month to date at the end of the week, for categories that have a budget.
      'budgets', coalesce((select jsonb_agg(jsonb_build_object(
          'category', c.name, 'budget', c.monthly_budget,
          'spent_month_to_date', coalesce((select -sum(tx.amount) from tx where tx.category_id = c.id), 0))
          order by c.position, c.name)
        from public.money_categories c
        where c.user_id = p_user_id and c.kind = 'expense' and c.monthly_budget is not null), '[]'::jsonb)
    ),
    'admin', jsonb_build_object(
      'todos_done', coalesce((select jsonb_agg(title) from todos, wk where done_on between wk.d0 and wk.d6), '[]'::jsonb),
      'todos_overdue', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'due', due_date, 'priority', priority) order by due_date)
        from todos, wk where due_date < wk.d6 and (done_on is null or done_on > wk.d6)), '[]'::jsonb),
      'todos_due_next_week', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'due', due_date, 'priority', priority) order by due_date)
        from todos, wk where due_date between wk.d6 + 1 and wk.d6 + 7 and done_on is null), '[]'::jsonb),
      'books_finished', coalesce((select jsonb_agg(b.title) from public.admin_books b, wk
        where b.user_id = p_user_id and b.status = 'finished' and b.finished_on between wk.d0 and wk.d6), '[]'::jsonb),
      'books_reading', coalesce((select jsonb_agg(b.title) from public.admin_books b
        where b.user_id = p_user_id and b.status = 'reading'), '[]'::jsonb),
      'trips_soon', coalesce((select jsonb_agg(jsonb_build_object('name', t.name, 'start', t.start_date) order by t.start_date)
        from public.admin_trips t, wk
        where t.user_id = p_user_id and t.start_date between wk.d6 + 1 and wk.d6 + 30), '[]'::jsonb)
    )
  )
  from wk;
$$;

revoke execute on function public.review_week_stats(uuid, date, text) from public, anon;
grant execute on function public.review_week_stats(uuid, date, text) to authenticated;
