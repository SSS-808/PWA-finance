create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.categories (user_id, name, kind)
  select new.id, c.name, c.kind
  from (values
    ('Food', 'expense'), ('Transportation', 'expense'), ('Education', 'expense'),
    ('Entertainment', 'expense'), ('Shopping', 'expense'), ('Bills', 'expense'),
    ('Healthcare', 'expense'), ('Travel', 'expense'), ('Other', 'expense'),
    ('Salary', 'income'), ('Freelance', 'income'), ('Business', 'income'),
    ('Investment', 'income'), ('Gift', 'income'), ('Other', 'income')
  ) as c (name, kind);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.audit_transaction() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.transaction_audit (transaction_id, user_id, action, old_row, new_row)
  values (new.id, new.user_id, lower(tg_op),
          case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return null;
end $$;

create trigger transactions_audit
  after insert or update on public.transactions
  for each row execute function private.audit_transaction();

create function private.check_transfer_legs() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  r record;
begin
  foreach v_id in array array_remove(array[new.transfer_id, case when tg_op = 'UPDATE' then old.transfer_id end], null) loop
    select count(*) as legs,
           count(*) filter (where amount_minor < 0) as outs,
           count(*) filter (where amount_minor > 0) as ins,
           count(distinct account_id) as accounts,
           count(distinct user_id) as users,
           count(distinct transaction_date) as dates,
           count(distinct currency) as currencies,
           coalesce(sum(amount_minor), 0) as total
      into r
      from public.transactions
     where transfer_id = v_id and deleted_at is null;

    if r.legs <> 0 and (r.legs <> 2 or r.outs <> 1 or r.ins <> 1 or r.accounts <> 2
                        or r.users <> 1 or r.dates <> 1 or (r.currencies = 1 and r.total <> 0)) then
      raise exception 'Transfer % is unbalanced', v_id using errcode = '23514';
    end if;
  end loop;
  return null;
end $$;

create constraint trigger transactions_transfer_legs
  after insert or update on public.transactions
  deferrable initially deferred
  for each row execute function private.check_transfer_legs();

create view public.account_balances with (security_invoker = true) as
select a.id as account_id,
       a.user_id,
       a.currency,
       coalesce(sum(t.amount_minor) filter (where t.deleted_at is null), 0)::bigint as balance_minor
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

create function public.create_transfer(
  p_from_account uuid,
  p_to_account uuid,
  p_from_amount_minor bigint,
  p_to_amount_minor bigint,
  p_date date,
  p_description text default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_transfer_id uuid := gen_random_uuid();
  v_from_currency char(3);
  v_to_currency char(3);
begin
  if p_from_account = p_to_account then
    raise exception 'Choose two different accounts' using errcode = '22023';
  end if;
  if p_from_amount_minor <= 0 or p_to_amount_minor <= 0 then
    raise exception 'Amounts must be positive' using errcode = '22023';
  end if;

  select currency into v_from_currency from public.accounts where id = p_from_account and archived_at is null;
  select currency into v_to_currency from public.accounts where id = p_to_account and archived_at is null;
  if v_from_currency is null or v_to_currency is null then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;
  if v_from_currency = v_to_currency and p_from_amount_minor <> p_to_amount_minor then
    raise exception 'Same-currency transfer amounts must match' using errcode = '22023';
  end if;

  insert into public.transactions (account_id, kind, amount_minor, currency, description, transaction_date, transfer_id)
  values (p_from_account, 'transfer', -p_from_amount_minor, v_from_currency, p_description, p_date, v_transfer_id),
         (p_to_account,   'transfer',  p_to_amount_minor,  v_to_currency,   p_description, p_date, v_transfer_id);

  return v_transfer_id;
end $$;

revoke execute on function public.create_transfer(uuid, uuid, bigint, bigint, date, text) from public, anon;
grant execute on function public.create_transfer(uuid, uuid, bigint, bigint, date, text) to authenticated;
