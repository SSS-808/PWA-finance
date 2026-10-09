alter table public.currencies enable row level security;
create policy "anyone logged in can read currencies" on public.currencies
  for select to authenticated using (true);

alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter table public.accounts enable row level security;
create policy "read own" on public.accounts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own" on public.accounts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own" on public.accounts
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.categories enable row level security;
create policy "read own" on public.categories
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own" on public.categories
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own" on public.categories
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.transactions enable row level security;
create policy "read own" on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own" on public.transactions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own" on public.transactions
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.transaction_audit enable row level security;
create policy "read own history" on public.transaction_audit
  for select to authenticated using (user_id = (select auth.uid()));
