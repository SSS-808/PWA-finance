-- Lent and borrowed: each person gets a hidden IOU jar per currency, and money moves in and out of it as transfers (docs/adr/019-people-are-iou-jars.md)
create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null constraint people_name_check check (char_length(btrim(name)) between 1 and 40),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)  -- target for the composite foreign key below
);
create unique index people_active_name_uq on public.people (user_id, lower(btrim(name))) where archived_at is null;
create index people_user_idx on public.people (user_id);

create trigger people_set_updated_at
  before update on public.people
  for each row execute function private.set_updated_at();

-- A jar is an account of type 'person' that belongs to one person, never counts on Home and has no minimum
alter table public.accounts drop constraint accounts_type_check;
alter table public.accounts
  add constraint accounts_type_check
    check (type in ('cash', 'bank', 'savings', 'credit_card', 'loan', 'investment', 'other', 'person')),
  add column person_id uuid,
  add column due_on date constraint accounts_due_on_check check (due_on between '2000-01-01' and '2100-12-31'),
  add constraint accounts_person_fk foreign key (person_id, user_id) references public.people (id, user_id),
  add constraint accounts_person_only_for_jars check ((type = 'person') = (person_id is not null)),
  add constraint accounts_due_on_only_for_jars check (due_on is null or type = 'person'),
  add constraint accounts_jar_hidden check (type <> 'person' or (show_on_home = false and minimum_minor = 0));
create unique index accounts_one_jar_per_currency_uq on public.accounts (user_id, person_id, currency)
  where person_id is not null and archived_at is null;

-- Jars carry their person's name, so they stay out of the one-name-per-currency rule for real accounts
drop index public.accounts_active_name_uq;
create unique index accounts_active_name_uq on public.accounts (user_id, lower(name), currency)
  where archived_at is null and type <> 'person';

-- Renaming a person renames their jars, so History never shows an old name
create function private.rename_person_jars() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.accounts set name = btrim(new.name) where person_id = new.id;
  return new;
end $$;

create trigger people_rename_jars
  after update of name on public.people
  for each row execute function private.rename_person_jars();

-- Returns the person's open jar in that currency, making it the first time it's needed
create function public.person_jar(p_person_id uuid, p_currency char(3)) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_jar uuid;
  v_name text;
begin
  select id into v_jar from public.accounts
   where person_id = p_person_id and currency = p_currency and archived_at is null;
  if v_jar is not null then
    return v_jar;
  end if;

  select btrim(name) into v_name from public.people where id = p_person_id and archived_at is null;
  if v_name is null then
    raise exception 'Person not found' using errcode = 'P0002';
  end if;

  insert into public.accounts (name, type, currency, person_id, show_on_home, minimum_minor)
  values (v_name, 'person', p_currency, p_person_id, false, 0)
  returning id into v_jar;
  return v_jar;
end $$;

-- Lend, borrow or pay back: one transfer between a real account and the person's jar; the two amounts differ only across currencies
create function public.move_money_with_person(
  p_person_id uuid,
  p_account_id uuid,
  p_to_person boolean,
  p_person_currency char(3),
  p_person_amount_minor bigint,
  p_account_amount_minor bigint,
  p_date date,
  p_description text default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_type text;
  v_jar uuid;
begin
  select type into v_type from public.accounts where id = p_account_id and archived_at is null;
  if v_type is null then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;
  if v_type = 'person' then
    raise exception 'Choose one of your own accounts' using errcode = '22023';
  end if;

  v_jar := public.person_jar(p_person_id, p_person_currency);

  if p_to_person then
    return public.create_transfer(p_account_id, v_jar, p_account_amount_minor, p_person_amount_minor, p_date, p_description);
  end if;
  return public.create_transfer(v_jar, p_account_id, p_person_amount_minor, p_account_amount_minor, p_date, p_description);
end $$;

-- A debt from before the app: above zero they owe you, below zero you owe them; no account changes
create function public.start_person_balance(
  p_person_id uuid,
  p_currency char(3),
  p_amount_minor bigint,
  p_date date,
  p_description text default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_jar uuid;
  v_id uuid;
begin
  v_jar := public.person_jar(p_person_id, p_currency);
  insert into public.transactions (account_id, kind, amount_minor, currency, description, transaction_date)
  values (v_jar, 'adjustment', p_amount_minor, p_currency, p_description, p_date)
  returning id into v_id;
  return v_id;
end $$;

-- Forgive what's left in a jar: owed to you becomes an expense, owed by you becomes income; returns the amount forgiven
create function public.forgive_person_balance(p_jar_id uuid, p_date date) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
  v_currency char(3);
  v_balance bigint;
  v_kind text;
  v_name text;
  v_category uuid;
begin
  -- Locking the jar stops two quick taps from forgiving twice
  select currency into v_currency from public.accounts
   where id = p_jar_id and type = 'person' and archived_at is null
     for update;
  if v_currency is null then
    raise exception 'Jar not found' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount_minor), 0) into v_balance
    from public.transactions
   where account_id = p_jar_id and deleted_at is null;
  if v_balance = 0 then
    raise exception 'Nothing left to forgive' using errcode = '22023';
  end if;

  if v_balance > 0 then
    v_kind := 'expense';
    v_name := 'Loans written off';
  else
    v_kind := 'income';
    v_name := 'Debts forgiven';
  end if;

  select id into v_category from public.categories
   where kind = v_kind and lower(name) = lower(v_name) and archived_at is null;
  if v_category is null then
    insert into public.categories (name, kind, icon, color)
    values (v_name, v_kind, 'gift', 'gray')
    returning id into v_category;
  end if;

  insert into public.transactions (account_id, category_id, kind, amount_minor, currency, transaction_date)
  values (p_jar_id, v_category, v_kind, -v_balance, v_currency, p_date);
  return abs(v_balance);
end $$;

-- Only logged-in users, and only their own people; a person is archived, never deleted, so History keeps its names
revoke all on public.people from anon, authenticated;
grant select, insert, update on public.people to authenticated;

alter table public.people enable row level security;
create policy "read own" on public.people
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own" on public.people
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own" on public.people
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke execute on function public.person_jar(uuid, char) from public, anon;
grant execute on function public.person_jar(uuid, char) to authenticated;
revoke execute on function public.move_money_with_person(uuid, uuid, boolean, char, bigint, bigint, date, text) from public, anon;
grant execute on function public.move_money_with_person(uuid, uuid, boolean, char, bigint, bigint, date, text) to authenticated;
revoke execute on function public.start_person_balance(uuid, char, bigint, date, text) from public, anon;
grant execute on function public.start_person_balance(uuid, char, bigint, date, text) to authenticated;
revoke execute on function public.forgive_person_balance(uuid, date) from public, anon;
grant execute on function public.forgive_person_balance(uuid, date) to authenticated;
