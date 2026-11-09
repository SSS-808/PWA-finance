-- Whether an account counts on Home; accounts that exist already start on, so Home stays the same
alter table public.accounts
  add column show_on_home boolean not null default true;

-- create_account and update_account take the switch too; leaving it out still works, so the database can go first at release
drop function public.create_account(text, text, char, bigint, date, bigint);
create function public.create_account(
  p_name text,
  p_type text,
  p_currency char(3),
  p_opening_balance_minor bigint,
  p_opened_on date,
  p_minimum_minor bigint,
  p_show_on_home boolean default true
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.accounts (name, type, currency, minimum_minor, show_on_home)
  values (p_name, p_type, p_currency, p_minimum_minor, p_show_on_home)
  returning id into v_id;

  if p_opening_balance_minor <> 0 then
    insert into public.transactions (account_id, kind, amount_minor, currency, transaction_date)
    values (v_id, 'opening_balance', p_opening_balance_minor, p_currency, p_opened_on);
  end if;

  return v_id;
end $$;

drop function public.update_account(uuid, text, text, bigint, date, bigint);
create function public.update_account(
  p_account_id uuid,
  p_name text,
  p_type text,
  p_opening_balance_minor bigint,
  p_opened_on date,
  p_minimum_minor bigint,
  p_show_on_home boolean default null
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_currency char(3);
  v_opening_id uuid;
begin
  update public.accounts
     set name = p_name, type = p_type, minimum_minor = p_minimum_minor,
         show_on_home = coalesce(p_show_on_home, show_on_home)
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

revoke execute on function public.create_account(text, text, char, bigint, date, bigint, boolean) from public, anon;
grant execute on function public.create_account(text, text, char, bigint, date, bigint, boolean) to authenticated;
revoke execute on function public.update_account(uuid, text, text, bigint, date, bigint, boolean) from public, anon;
grant execute on function public.update_account(uuid, text, text, bigint, date, bigint, boolean) to authenticated;
