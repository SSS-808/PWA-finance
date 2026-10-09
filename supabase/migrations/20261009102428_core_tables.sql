create schema if not exists private;  -- not exposed by the Supabase API

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create table public.currencies (
  code char(3) primary key check (code ~ '^[A-Z]{3}$'),
  name text not null,
  minor_unit smallint not null check (minor_unit between 0 and 4)
);
insert into public.currencies (code, name, minor_unit) values
  ('LAK', 'Lao kip', 0),
  ('USD', 'US dollar', 2),
  ('THB', 'Thai baht', 2);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  base_currency char(3) not null default 'LAK' references public.currencies (code),
  timezone text not null default 'Asia/Vientiane',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  type text not null check (type in ('cash', 'bank', 'savings', 'credit_card', 'loan', 'investment', 'other')),
  currency char(3) not null references public.currencies (code),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id, currency)  -- target for the composite foreign key below
);
create unique index accounts_active_name_uq on public.accounts (user_id, lower(name)) where archived_at is null;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind text not null check (kind in ('income', 'expense')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id, kind)  -- target for the composite foreign key below
);
create unique index categories_active_name_uq on public.categories (user_id, kind, lower(name)) where archived_at is null;

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  account_id uuid not null,
  category_id uuid,
  kind text not null check (kind in ('income', 'expense', 'transfer', 'opening_balance', 'adjustment')),
  amount_minor bigint not null check (amount_minor <> 0 and amount_minor between -10000000000000 and 10000000000000),
  currency char(3) not null,
  description text check (char_length(description) <= 200),
  transaction_date date not null check (transaction_date between '2000-01-01' and '2100-12-31'),
  transfer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- the account must belong to the same user and use the same currency
  foreign key (account_id, user_id, currency) references public.accounts (id, user_id, currency),
  -- the category must belong to the same user and match the kind (income/expense)
  foreign key (category_id, user_id, kind) references public.categories (id, user_id, kind),

  constraint income_is_positive check (kind <> 'income' or amount_minor > 0),
  constraint expense_is_negative check (kind <> 'expense' or amount_minor < 0),
  constraint category_only_for_income_expense check ((kind in ('income', 'expense')) = (category_id is not null)),
  constraint transfer_id_only_for_transfers check ((kind = 'transfer') = (transfer_id is not null))
);

create table public.transaction_audit (
  id bigint generated always as identity primary key,
  transaction_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (action in ('insert', 'update')),
  old_row jsonb,
  new_row jsonb not null,
  changed_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc) where deleted_at is null;
create index transactions_account_idx on public.transactions (account_id) where deleted_at is null;
create index transactions_category_idx on public.transactions (category_id) where category_id is not null;
create index transactions_transfer_idx on public.transactions (transfer_id) where transfer_id is not null;
create unique index transactions_one_opening_balance_uq on public.transactions (account_id) where kind = 'opening_balance' and deleted_at is null;
create index accounts_user_idx on public.accounts (user_id);
create index categories_user_idx on public.categories (user_id);
create index transaction_audit_tx_idx on public.transaction_audit (transaction_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function private.set_updated_at();

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function private.set_updated_at();

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function private.set_updated_at();
