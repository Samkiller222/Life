-- Phase 2: training hub.
-- Gym sessions with sets, and swim sessions. Every table is scoped to its owner with row-level security.

create table public.training_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.training_gym_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  name text not null default '' check (char_length(name) <= 100),
  duration_min integer check (duration_min between 1 and 1440),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.training_gym_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_id uuid not null references public.training_gym_sessions on delete cascade,
  exercise_id uuid not null references public.training_exercises on delete cascade,
  position integer not null,
  reps integer not null check (reps between 0 and 1000),
  weight_kg numeric not null default 0 check (weight_kg >= 0),
  created_at timestamptz not null default now()
);

create table public.training_swim_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  distance_m integer not null check (distance_m between 1 and 100000),
  duration_min numeric check (duration_min > 0 and duration_min <= 1440),
  focus text not null default '' check (char_length(focus) <= 100),
  notes text not null default '',
  -- 'manual' for swims logged here; 'platform' for swims the swim platform sends later.
  source text not null default 'manual' check (source in ('manual', 'platform')),
  -- The swim platform's own id, so re-importing a swim updates it instead of duplicating it.
  external_id text,
  created_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create unique index training_exercises_user_name_idx on public.training_exercises (user_id, lower(name));
create index training_gym_sessions_user_date_idx on public.training_gym_sessions (user_id, date);
create index training_gym_sets_session_idx on public.training_gym_sets (session_id);
create index training_gym_sets_exercise_idx on public.training_gym_sets (exercise_id);
create index training_gym_sets_user_idx on public.training_gym_sets (user_id);
create index training_swim_sessions_user_date_idx on public.training_swim_sessions (user_id, date);

alter table public.training_exercises enable row level security;
alter table public.training_gym_sessions enable row level security;
alter table public.training_gym_sets enable row level security;
alter table public.training_swim_sessions enable row level security;

create policy "Own training exercises" on public.training_exercises
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own gym sessions" on public.training_gym_sessions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own gym sets" on public.training_gym_sets
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own swim sessions" on public.training_swim_sessions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Saves a gym session and its sets in one step. Pass p_id to replace an existing session's details and sets.
-- p_sets is a JSON array of {"exercise": "Bench press", "reps": 8, "weight_kg": 60}, in order.
-- Exercise names are matched case-insensitively and added to the exercise list when new.
create function public.training_save_gym_session(
  p_id uuid,
  p_date date,
  p_name text,
  p_duration_min integer,
  p_notes text,
  p_sets jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_set jsonb;
  v_name text;
  v_exercise uuid;
  v_position integer := 0;
begin
  if p_id is null then
    insert into public.training_gym_sessions (date, name, duration_min, notes)
      values (p_date, btrim(coalesce(p_name, '')), p_duration_min, coalesce(p_notes, ''))
      returning id into v_id;
  else
    update public.training_gym_sessions
      set date = p_date, name = btrim(coalesce(p_name, '')), duration_min = p_duration_min, notes = coalesce(p_notes, '')
      where id = p_id and user_id = (select auth.uid())
      returning id into v_id;
    if v_id is null then
      raise exception 'Gym session not found';
    end if;
    delete from public.training_gym_sets where session_id = v_id;
  end if;

  for v_set in select value from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) loop
    v_name := btrim(coalesce(v_set ->> 'exercise', ''));
    continue when v_name = '';
    select id into v_exercise from public.training_exercises
      where user_id = (select auth.uid()) and lower(name) = lower(v_name);
    if v_exercise is null then
      insert into public.training_exercises (name) values (v_name) returning id into v_exercise;
    end if;
    v_position := v_position + 1;
    insert into public.training_gym_sets (session_id, exercise_id, position, reps, weight_kg)
      values (v_id, v_exercise, v_position, (v_set ->> 'reps')::integer, coalesce((v_set ->> 'weight_kg')::numeric, 0));
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.training_save_gym_session(uuid, date, text, integer, text, jsonb) from public, anon;
grant execute on function public.training_save_gym_session(uuid, date, text, integer, text, jsonb) to authenticated;
