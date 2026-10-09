-- Changes both sides of a transfer together; the same rules as create_transfer
create function public.update_transfer(
  p_transfer_id uuid,
  p_from_account uuid,
  p_to_account uuid,
  p_from_amount_minor bigint,
  p_to_amount_minor bigint,
  p_date date,
  p_description text default null
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_from_currency char(3);
  v_to_currency char(3);
  v_rows int;
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

  update public.transactions
     set account_id = p_from_account, currency = v_from_currency, amount_minor = -p_from_amount_minor,
         transaction_date = p_date, description = p_description
   where transfer_id = p_transfer_id and amount_minor < 0 and deleted_at is null;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'Transfer not found' using errcode = 'P0002';
  end if;

  update public.transactions
     set account_id = p_to_account, currency = v_to_currency, amount_minor = p_to_amount_minor,
         transaction_date = p_date, description = p_description
   where transfer_id = p_transfer_id and amount_minor > 0 and deleted_at is null;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'Transfer not found' using errcode = 'P0002';
  end if;
end $$;

-- Soft-deletes both sides of a transfer together
create function public.delete_transfer(p_transfer_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_rows int;
begin
  update public.transactions
     set deleted_at = now()
   where transfer_id = p_transfer_id and deleted_at is null;
  get diagnostics v_rows = row_count;
  if v_rows <> 2 then
    raise exception 'Transfer not found' using errcode = 'P0002';
  end if;
end $$;

-- "My bank app says X": adds an adjustment for the difference and returns it (0 means nothing changed)
create function public.set_account_balance(
  p_account_id uuid,
  p_target_balance_minor bigint,
  p_date date,
  p_description text default null
) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
  v_currency char(3);
  v_current bigint;
  v_difference bigint;
begin
  -- Locking the account row stops two quick taps from adding the correction twice
  select currency into v_currency from public.accounts
   where id = p_account_id and archived_at is null
     for update;
  if v_currency is null then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount_minor), 0) into v_current
    from public.transactions
   where account_id = p_account_id and deleted_at is null;

  v_difference := p_target_balance_minor - v_current;
  if v_difference <> 0 then
    insert into public.transactions (account_id, kind, amount_minor, currency, description, transaction_date)
    values (p_account_id, 'adjustment', v_difference, v_currency, p_description, p_date);
  end if;
  return v_difference;
end $$;

revoke execute on function public.update_transfer(uuid, uuid, uuid, bigint, bigint, date, text) from public, anon;
grant execute on function public.update_transfer(uuid, uuid, uuid, bigint, bigint, date, text) to authenticated;
revoke execute on function public.delete_transfer(uuid) from public, anon;
grant execute on function public.delete_transfer(uuid) to authenticated;
revoke execute on function public.set_account_balance(uuid, bigint, date, text) from public, anon;
grant execute on function public.set_account_balance(uuid, bigint, date, text) to authenticated;
