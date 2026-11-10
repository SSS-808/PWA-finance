-- Trips: a named stretch of days whose money in and out can carry the trip's label (docs/adr/015-trips-are-labels.md)
create extension if not exists btree_gist with schema extensions;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null constraint trips_name_check check (char_length(btrim(name)) between 1 and 60),
  starts_on date not null check (starts_on between '2000-01-01' and '2100-12-31'),
  ends_on date not null check (ends_on between '2000-01-01' and '2100-12-31'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),  -- target for the composite foreign key below
  constraint trips_dates_in_order check (ends_on >= starts_on),
  -- two trips of the same person can't share a day
  constraint trips_no_overlap exclude using gist (user_id with =, daterange(starts_on, ends_on, '[]') with &&)
);

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function private.set_updated_at();

-- An entry can carry a trip of the same person; deleting the trip only clears the label
alter table public.transactions
  add column trip_id uuid,
  add constraint transactions_trip_fk
    foreign key (trip_id, user_id) references public.trips (id, user_id) on delete set null (trip_id),
  add constraint trip_only_for_income_expense check (trip_id is null or kind in ('income', 'expense'));
create index transactions_trip_idx on public.transactions (trip_id) where trip_id is not null;

-- Labels the money in and out of the trip's days that has no trip yet; returns how many entries it labelled
create function public.label_trip_entries(p_trip_id uuid) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  v_starts_on date;
  v_ends_on date;
  v_count integer;
begin
  select starts_on, ends_on into v_starts_on, v_ends_on from public.trips where id = p_trip_id;
  if not found then
    raise exception 'Trip not found' using errcode = 'P0002';
  end if;

  update public.transactions
     set trip_id = p_trip_id
   where trip_id is null
     and deleted_at is null
     and kind in ('income', 'expense')
     and transaction_date between v_starts_on and v_ends_on;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Only logged-in users, and only their own trips; a trip can be deleted
revoke all on public.trips from anon, authenticated;
grant select, insert, update, delete on public.trips to authenticated;
revoke execute on function public.label_trip_entries(uuid) from public, anon;
grant execute on function public.label_trip_entries(uuid) to authenticated;

alter table public.trips enable row level security;
create policy "read own" on public.trips
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own" on public.trips
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own" on public.trips
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own" on public.trips
  for delete to authenticated using (user_id = (select auth.uid()));
