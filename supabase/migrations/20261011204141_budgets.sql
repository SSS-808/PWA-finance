-- Budgets: a monthly spending limit per expense category and currency (docs/adr/010)
-- A row applies from start_month on; the budget for a month is the latest row at or before it
-- amount_minor = 0 ends the budget from that month on

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id uuid not null,
  kind text not null default 'expense' check (kind = 'expense'),
  currency char(3) not null references public.currencies (code),
  start_month date not null check (start_month between '2000-01-01' and '2100-12-01' and extract(day from start_month) = 1),
  amount_minor bigint not null check (amount_minor between 0 and 10000000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- the category must belong to the same user and be an expense category
  foreign key (category_id, user_id, kind) references public.categories (id, user_id, kind),
  -- one row per category, currency and starting month; also the index for "my budgets"
  unique (user_id, category_id, currency, start_month)
);
create index budgets_category_idx on public.budgets (category_id);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function private.set_updated_at();

-- Only logged-in users, and only read, add and change: a budget is ended with amount 0, never deleted
revoke all on public.budgets from anon, authenticated;
grant select, insert, update on public.budgets to authenticated;

alter table public.budgets enable row level security;
create policy "read own" on public.budgets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own" on public.budgets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own" on public.budgets
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
