-- iPhone Shortcut keys: a key can only add an expense to one account (docs/adr/018-shortcut-keys.md)
create table public.shortcut_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null constraint shortcut_keys_name_check check (char_length(btrim(name)) between 1 and 40),
  account_id uuid not null,
  currency char(3) not null,
  -- sha256 of the key in hex; the key itself is never stored
  key_hash text not null unique constraint shortcut_keys_hash_check check (key_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  window_started_at timestamptz,
  uses_in_window integer not null default 0 check (uses_in_window >= 0),
  foreign key (account_id, user_id, currency) references public.accounts (id, user_id, currency) on delete cascade
);
create index shortcut_keys_user_idx on public.shortcut_keys (user_id);

-- At most 3 keys per person
create function private.check_shortcut_key_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.shortcut_keys where user_id = new.user_id) >= 3 then
    raise exception 'shortcut_key_limit' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger shortcut_keys_limit
  before insert on public.shortcut_keys
  for each row execute function private.check_shortcut_key_limit();

-- The currency of the key's account, or null when the key is unknown
create function public.shortcut_key_currency(p_key text) returns char(3)
language sql stable security definer set search_path = '' as $$
  select k.currency
    from public.shortcut_keys k
   where k.key_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex');
$$;

-- Adds one expense for the key's owner; p_amount_minor is positive and saved as negative
create function public.shortcut_add_expense(p_key text, p_amount_minor bigint, p_category text, p_note text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_key public.shortcut_keys;
  v_account_name text;
  v_archived_at timestamptz;
  v_category_id uuid;
  v_category_name text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_today date;
  v_trip_id uuid;
  v_id uuid;
begin
  select * into v_key
    from public.shortcut_keys
   where key_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex')
     for update;
  if not found then
    return jsonb_build_object('status', 'bad_key');
  end if;

  if p_amount_minor is null or p_amount_minor <= 0 or p_amount_minor > 10000000000000 then
    return jsonb_build_object('status', 'bad_amount');
  end if;
  if char_length(v_note) > 200 then
    return jsonb_build_object('status', 'bad_note');
  end if;

  select a.name, a.archived_at into v_account_name, v_archived_at
    from public.accounts a
   where a.id = v_key.account_id;
  if v_archived_at is not null then
    return jsonb_build_object('status', 'account_archived');
  end if;

  -- 30 entries per key per hour
  if v_key.window_started_at is null or v_key.window_started_at <= now() - interval '1 hour' then
    v_key.window_started_at := now();
    v_key.uses_in_window := 0;
  end if;
  if v_key.uses_in_window >= 30 then
    return jsonb_build_object('status', 'too_many');
  end if;

  -- The named expense category, else "Other"
  select c.id, c.name into v_category_id, v_category_name
    from public.categories c
   where c.user_id = v_key.user_id and c.kind = 'expense' and c.archived_at is null
     and lower(c.name) = lower(btrim(coalesce(p_category, '')));
  if v_category_id is null then
    select c.id, c.name into v_category_id, v_category_name
      from public.categories c
     where c.user_id = v_key.user_id and c.kind = 'expense' and c.archived_at is null
       and lower(c.name) = 'other';
  end if;
  if v_category_id is null then
    return jsonb_build_object('status', 'no_category');
  end if;

  select (now() at time zone p.timezone)::date into v_today
    from public.profiles p
   where p.id = v_key.user_id;

  -- The same entry sent twice within a minute is saved once
  if exists (
    select 1 from public.transactions t
     where t.user_id = v_key.user_id and t.account_id = v_key.account_id
       and t.kind = 'expense' and t.amount_minor = -p_amount_minor
       and t.category_id = v_category_id and t.description is not distinct from v_note
       and t.deleted_at is null and t.created_at > now() - interval '1 minute'
  ) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  -- Like the Add form, a day inside a trip gets that trip
  select tr.id into v_trip_id
    from public.trips tr
   where tr.user_id = v_key.user_id and v_today between tr.starts_on and tr.ends_on;

  insert into public.transactions (user_id, account_id, category_id, kind, amount_minor, currency, description, transaction_date, trip_id)
  values (v_key.user_id, v_key.account_id, v_category_id, 'expense', -p_amount_minor, v_key.currency, v_note, v_today, v_trip_id)
  returning id into v_id;

  update public.shortcut_keys
     set last_used_at = now(),
         window_started_at = v_key.window_started_at,
         uses_in_window = v_key.uses_in_window + 1
   where id = v_key.id;

  return jsonb_build_object(
    'status', 'saved',
    'id', v_id,
    'amount_minor', p_amount_minor,
    'currency', v_key.currency,
    'account', v_account_name,
    'category', v_category_name
  );
end $$;

-- People see and manage their own keys but never read the hash or the counters
revoke all on public.shortcut_keys from anon, authenticated;
grant select (id, user_id, name, account_id, currency, created_at, last_used_at) on public.shortcut_keys to authenticated;
grant insert (name, account_id, currency, key_hash) on public.shortcut_keys to authenticated;
grant delete on public.shortcut_keys to authenticated;

-- The Shortcut has no login, so only anon runs these; the key is the check
revoke execute on function public.shortcut_key_currency(text) from public, anon, authenticated;
revoke execute on function public.shortcut_add_expense(text, bigint, text, text) from public, anon, authenticated;
grant execute on function public.shortcut_key_currency(text) to anon;
grant execute on function public.shortcut_add_expense(text, bigint, text, text) to anon;

alter table public.shortcut_keys enable row level security;
create policy "read own" on public.shortcut_keys
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own" on public.shortcut_keys
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "delete own" on public.shortcut_keys
  for delete to authenticated using (user_id = (select auth.uid()));
