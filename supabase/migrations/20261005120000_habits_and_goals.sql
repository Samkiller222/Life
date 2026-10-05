-- Phase 1: habits and goals.
-- Every table is scoped to its owner with row-level security.

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  -- Weekdays the habit is due, 0 = Sunday ... 6 = Saturday.
  days smallint[] not null default '{0,1,2,3,4,5,6}',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id uuid not null references public.habits on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  unit text not null default '',
  target_value numeric not null check (target_value > 0),
  current_value numeric not null default 0,
  target_date date,
  created_at timestamptz not null default now()
);

create table public.goal_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  goal_id uuid not null references public.goals on delete cascade,
  value numeric not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index habits_user_idx on public.habits (user_id);
create index habit_checkins_user_date_idx on public.habit_checkins (user_id, date);
create index goals_user_idx on public.goals (user_id);
create index goal_updates_goal_idx on public.goal_updates (goal_id);

alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;
alter table public.goals enable row level security;
alter table public.goal_updates enable row level security;

create policy "Own habits" on public.habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Own habit check-ins" on public.habit_checkins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Own goals" on public.goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Own goal updates" on public.goal_updates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Logging progress adds to the goal's running total in one step.
create function public.log_goal_progress(p_goal_id uuid, p_value numeric, p_note text default '')
returns void
language sql
security invoker
as $$
  insert into public.goal_updates (goal_id, value, note) values (p_goal_id, p_value, p_note);
  update public.goals set current_value = current_value + p_value
    where id = p_goal_id and user_id = auth.uid();
$$;
