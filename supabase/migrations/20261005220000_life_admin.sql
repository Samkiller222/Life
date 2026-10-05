-- Phase 4: life admin.
-- Trips with checklists and costs, to-dos with deadlines (optionally tied to a trip) and a reading list.
-- Every table is scoped to its owner with row-level security.

create table public.admin_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  destination text not null default '' check (char_length(destination) <= 100),
  start_date date,
  end_date date,
  -- Euro.
  budget numeric(12, 2) check (budget >= 0),
  notes text not null default '' check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.admin_trip_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  trip_id uuid not null references public.admin_trips on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.admin_trip_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  trip_id uuid not null references public.admin_trips on delete cascade,
  description text not null check (char_length(description) between 1 and 200),
  -- Free text such as Travel, Stay, Food or Activities.
  category text not null default '' check (char_length(category) <= 60),
  -- Euro, positive for money spent.
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create table public.admin_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text not null default '' check (char_length(notes) <= 4000),
  due_date date,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  -- Set when ticked off, so finished to-dos can be shown and cleared later.
  done_at timestamptz,
  trip_id uuid references public.admin_trips on delete cascade,
  created_at timestamptz not null default now()
);

create table public.admin_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  author text not null default '' check (char_length(author) <= 200),
  status text not null default 'want' check (status in ('want', 'reading', 'finished')),
  started_on date,
  finished_on date,
  rating smallint check (rating between 1 and 5),
  notes text not null default '' check (char_length(notes) <= 4000),
  created_at timestamptz not null default now()
);

create index admin_trips_user_idx on public.admin_trips (user_id, start_date);
create index admin_trip_items_trip_idx on public.admin_trip_items (trip_id, position);
create index admin_trip_items_user_idx on public.admin_trip_items (user_id);
create index admin_trip_costs_trip_idx on public.admin_trip_costs (trip_id);
create index admin_trip_costs_user_idx on public.admin_trip_costs (user_id);
create index admin_todos_user_idx on public.admin_todos (user_id, due_date);
create index admin_todos_trip_idx on public.admin_todos (trip_id);
create index admin_books_user_idx on public.admin_books (user_id, status);

alter table public.admin_trips enable row level security;
alter table public.admin_trip_items enable row level security;
alter table public.admin_trip_costs enable row level security;
alter table public.admin_todos enable row level security;
alter table public.admin_books enable row level security;

create policy "Own trips" on public.admin_trips
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own trip checklist items" on public.admin_trip_items
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own trip costs" on public.admin_trip_costs
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own to-dos" on public.admin_todos
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own books" on public.admin_books
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
