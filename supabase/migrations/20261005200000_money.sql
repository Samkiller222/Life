-- Phase 3: money.
-- Bank accounts with their CSV layout, imported transactions, spending categories with monthly budgets,
-- categorising rules and savings goals. Every table is scoped to its owner with row-level security.

create table public.money_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  -- How this bank's CSV is laid out (which columns hold the date, description and amount), saved from the first import.
  csv_format jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.money_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  -- 'expense' counts towards spending, 'income' towards money in, 'transfer' (moving money between your own accounts) towards neither.
  kind text not null default 'expense' check (kind in ('expense', 'income', 'transfer')),
  monthly_budget numeric(12, 2) check (monthly_budget >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.money_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- Matched case-insensitively anywhere in a transaction's description. The first rule by position wins.
  pattern text not null check (char_length(btrim(pattern)) between 1 and 200),
  category_id uuid not null references public.money_categories on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.money_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid not null references public.money_accounts on delete cascade,
  date date not null,
  description text not null default '' check (char_length(description) <= 500),
  -- Negative for money out, positive for money in.
  amount numeric(12, 2) not null,
  category_id uuid references public.money_categories on delete set null,
  -- 'rule' when a rule set the category, 'manual' when you picked it (rules then leave it alone).
  categorised_by text check (categorised_by in ('rule', 'manual')),
  -- Built from the CSV row, so importing the same file twice adds nothing new.
  import_key text,
  created_at timestamptz not null default now(),
  unique (user_id, account_id, import_key)
);

create table public.money_savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  target_amount numeric(12, 2) not null check (target_amount > 0),
  saved_amount numeric(12, 2) not null default 0,
  target_date date,
  created_at timestamptz not null default now()
);

create index money_accounts_user_idx on public.money_accounts (user_id);
create unique index money_categories_user_name_idx on public.money_categories (user_id, lower(name));
create index money_rules_user_idx on public.money_rules (user_id, position);
create index money_rules_category_idx on public.money_rules (category_id);
create index money_transactions_user_date_idx on public.money_transactions (user_id, date);
create index money_transactions_account_idx on public.money_transactions (account_id);
create index money_transactions_category_idx on public.money_transactions (category_id);
create index money_savings_goals_user_idx on public.money_savings_goals (user_id);

alter table public.money_accounts enable row level security;
alter table public.money_categories enable row level security;
alter table public.money_rules enable row level security;
alter table public.money_transactions enable row level security;
alter table public.money_savings_goals enable row level security;

create policy "Own money accounts" on public.money_accounts
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own money categories" on public.money_categories
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own money rules" on public.money_rules
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own money transactions" on public.money_transactions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own savings goals" on public.money_savings_goals
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Re-runs your rules over every transaction whose category you did not pick by hand.
-- Returns how many transactions changed category.
create function public.money_apply_rules()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  with matched as (
    select t.id,
      (select r.category_id from public.money_rules r
        where r.user_id = t.user_id and strpos(lower(t.description), lower(btrim(r.pattern))) > 0
        order by r.position, r.created_at
        limit 1) as category_id
    from public.money_transactions t
    where t.user_id = (select auth.uid()) and (t.categorised_by is null or t.categorised_by = 'rule')
  )
  update public.money_transactions t
    set category_id = m.category_id,
        categorised_by = case when m.category_id is null then null else 'rule' end
    from matched m
    where t.id = m.id and t.category_id is distinct from m.category_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.money_apply_rules() from public, anon;
grant execute on function public.money_apply_rules() to authenticated;
