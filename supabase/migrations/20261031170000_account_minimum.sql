-- The amount the bank keeps in an account; the app shows the balance minus this as free to spend. Debts have none.
alter table public.accounts
  add column minimum_minor bigint not null default 0
    constraint accounts_minimum_check check (minimum_minor >= 0),
  add constraint accounts_debt_no_minimum_check check (minimum_minor = 0 or type not in ('credit_card', 'loan'));

-- Bank accounts that exist already start with the usual Lao minimum for their currency (₭50,000, $10, ฿500)
update public.accounts
   set minimum_minor = case currency when 'LAK' then 50000 when 'USD' then 1000 when 'THB' then 50000 else 0 end
 where type = 'bank';

-- create_account and update_account take the minimum too
drop function public.create_account(text, text, char, bigint, date);
create function public.create_account(
  p_name text,
  p_type text,
  p_currency char(3),
  p_opening_balance_minor bigint,
  p_opened_on date,
  p_minimum_minor bigint
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.accounts (name, type, currency, minimum_minor)
  values (p_name, p_type, p_currency, p_minimum_minor)
  returning id into v_id;

  if p_opening_balance_minor <> 0 then
    insert into public.transactions (account_id, kind, amount_minor, currency, transaction_date)
    values (v_id, 'opening_balance', p_opening_balance_minor, p_currency, p_opened_on);
  end if;

  return v_id;
end $$;

drop function public.update_account(uuid, text, text, bigint, date);
create function public.update_account(
  p_account_id uuid,
  p_name text,
  p_type text,
  p_opening_balance_minor bigint,
  p_opened_on date,
  p_minimum_minor bigint
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_currency char(3);
  v_opening_id uuid;
begin
  update public.accounts
     set name = p_name, type = p_type, minimum_minor = p_minimum_minor
   where id = p_account_id
  returning currency into v_currency;

  if v_currency is null then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  select id into v_opening_id
    from public.transactions
   where account_id = p_account_id and kind = 'opening_balance' and deleted_at is null;

  if v_opening_id is null then
    if p_opening_balance_minor <> 0 then
      insert into public.transactions (account_id, kind, amount_minor, currency, transaction_date)
      values (p_account_id, 'opening_balance', p_opening_balance_minor, v_currency, p_opened_on);
    end if;
  elsif p_opening_balance_minor = 0 then
    update public.transactions set deleted_at = now() where id = v_opening_id;
  else
    update public.transactions set amount_minor = p_opening_balance_minor where id = v_opening_id;
  end if;
end $$;

revoke execute on function public.create_account(text, text, char, bigint, date, bigint) from public, anon;
grant execute on function public.create_account(text, text, char, bigint, date, bigint) to authenticated;
revoke execute on function public.update_account(uuid, text, text, bigint, date, bigint) from public, anon;
grant execute on function public.update_account(uuid, text, text, bigint, date, bigint) to authenticated;

-- A bank icon for categories, and a "Bank fees" category for card and account fees
alter table public.categories drop constraint categories_icon_check;
alter table public.categories add constraint categories_icon_check check (icon in (
  'tag', 'utensils', 'car', 'graduation-cap', 'tv', 'shopping-bag', 'zap', 'heart-pulse',
  'plane', 'ellipsis', 'briefcase', 'laptop', 'store', 'trending-up', 'gift', 'house',
  'shirt', 'coffee', 'fuel', 'smartphone', 'baby', 'paw-print', 'dumbbell', 'wrench', 'landmark'));

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.categories (user_id, name, kind, icon, color)
  select new.id, c.name, c.kind, c.icon, c.color
  from (values
    ('Food', 'expense', 'utensils', 'orange'), ('Transportation', 'expense', 'car', 'blue'),
    ('Education', 'expense', 'graduation-cap', 'violet'), ('Entertainment', 'expense', 'tv', 'pink'),
    ('Shopping', 'expense', 'shopping-bag', 'teal'), ('Bills', 'expense', 'zap', 'amber'),
    ('Healthcare', 'expense', 'heart-pulse', 'rose'), ('Travel', 'expense', 'plane', 'indigo'),
    ('Bank fees', 'expense', 'landmark', 'gray'), ('Other', 'expense', 'ellipsis', 'gray'),
    ('Salary', 'income', 'briefcase', 'green'), ('Freelance', 'income', 'laptop', 'teal'),
    ('Business', 'income', 'store', 'indigo'), ('Investment', 'income', 'trending-up', 'amber'),
    ('Gift', 'income', 'gift', 'pink'), ('Other', 'income', 'ellipsis', 'gray')
  ) as c (name, kind, icon, color);
  return new;
end $$;

-- People who have no active "Bank fees" expense category yet get one
insert into public.categories (user_id, name, kind, icon, color)
select p.id, 'Bank fees', 'expense', 'landmark', 'gray'
  from public.profiles p
 where not exists (
   select 1 from public.categories c
    where c.user_id = p.id and c.kind = 'expense' and lower(c.name) = 'bank fees' and c.archived_at is null);
