-- Savings goals: a target to save toward, filled by contributions (docs/adr/011)
-- A contribution records money set aside; it does not move money between accounts
-- A negative contribution takes money back out; the saved total can never go below 0

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  currency char(3) not null references public.currencies (code),
  target_minor bigint not null check (target_minor between 1 and 10000000000000),
  deadline date check (deadline between '2000-01-01' and '2100-12-31'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id, currency)  -- target for the composite foreign key below
);
create unique index goals_active_name_uq on public.goals (user_id, lower(name)) where archived_at is null;
create index goals_user_idx on public.goals (user_id);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  goal_id uuid not null,
  currency char(3) not null,
  amount_minor bigint not null check (amount_minor <> 0 and amount_minor between -10000000000000 and 10000000000000),
  contributed_on date not null check (contributed_on between '2000-01-01' and '2100-12-31'),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),

  -- the goal must belong to the same user and use the same currency
  foreign key (goal_id, user_id, currency) references public.goals (id, user_id, currency)
);
create index goal_contributions_goal_idx on public.goal_contributions (goal_id);
create index goal_contributions_user_idx on public.goal_contributions (user_id);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function private.set_updated_at();

create function private.check_goal_saved() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_saved numeric;
begin
  -- Lock the goal so two contributions cannot both pass the check at the same moment
  perform 1 from public.goals where id = new.goal_id for no key update;
  select coalesce(sum(amount_minor), 0) into v_saved
    from public.goal_contributions
   where goal_id = new.goal_id;
  if v_saved < 0 then
    raise exception 'Goal % cannot go below zero', new.goal_id using errcode = '23514';
  end if;
  return null;
end $$;

create trigger goal_contributions_not_below_zero
  after insert on public.goal_contributions
  for each row execute function private.check_goal_saved();

-- What is saved toward each goal; a goal without contributions shows 0
create view public.goal_totals with (security_invoker = true) as
select g.id as goal_id,
       g.user_id,
       g.currency,
       coalesce(sum(c.amount_minor), 0)::bigint as saved_minor
from public.goals g
left join public.goal_contributions c on c.goal_id = g.id
group by g.id;

-- Only logged-in users. Goals: read, add, change (archive instead of delete). Contributions: read and add only
revoke all on public.goals, public.goal_contributions, public.goal_totals from anon, authenticated;
grant select, insert, update on public.goals to authenticated;
grant select, insert on public.goal_contributions to authenticated;
grant select on public.goal_totals to authenticated;

alter table public.goals enable row level security;
create policy "read own" on public.goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own" on public.goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own" on public.goals
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.goal_contributions enable row level security;
create policy "read own" on public.goal_contributions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own" on public.goal_contributions
  for insert to authenticated with check (user_id = (select auth.uid()));
