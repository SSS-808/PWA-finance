begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

insert into auth.users (id, email) values
  ('a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8', 'a@shortcut.test'),
  ('b8b8b8b8-b8b8-4b8b-8b8b-b8b8b8b8b8b8', 'b@shortcut.test');

-- The table is locked down, and only anon may run the two functions
select is((select relrowsecurity from pg_class where oid = 'public.shortcut_keys'::regclass), true, 'shortcut_keys has row level security on');
select is(has_table_privilege('anon', 'public.shortcut_keys', 'select'), false, 'anon cannot read keys');
select is(has_column_privilege('authenticated', 'public.shortcut_keys', 'key_hash', 'select'), false, 'nobody logged in can read a key hash');
select is(has_table_privilege('authenticated', 'public.shortcut_keys', 'update'), false, 'a key cannot be changed, only deleted');
select is(has_function_privilege('anon', 'public.shortcut_add_expense(text, bigint, text, text)', 'execute'), true, 'anon can run shortcut_add_expense');
select is(has_function_privilege('authenticated', 'public.shortcut_add_expense(text, bigint, text, text)', 'execute'), false, 'a logged-in user cannot run shortcut_add_expense');

set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8';
insert into public.accounts (id, name, type, currency) values
  ('a3000000-0000-4000-8000-0000000000a1', 'BCEL One', 'bank', 'LAK'),
  ('a3000000-0000-4000-8000-0000000000a2', 'Old bank', 'bank', 'LAK');

-- A key needs a name and the currency of its own account; 3 keys at most
select lives_ok($$insert into public.shortcut_keys (name, account_id, currency, key_hash)
  values ('iPhone', 'a3000000-0000-4000-8000-0000000000a1', 'LAK', encode(sha256('pw_keyA'::bytea), 'hex'))$$, 'A makes a key');
select is((select user_id from public.shortcut_keys where name = 'iPhone'), 'a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8'::uuid, 'the key belongs to A');
select throws_ok($$insert into public.shortcut_keys (name, account_id, currency, key_hash)
  values ('Wrong', 'a3000000-0000-4000-8000-0000000000a1', 'USD', encode(sha256('pw_wrong'::bytea), 'hex'))$$, '23503'::char(5), null, 'a currency that is not the account''s is refused');
select throws_ok($$insert into public.shortcut_keys (name, account_id, currency, key_hash)
  values ('  ', 'a3000000-0000-4000-8000-0000000000a1', 'LAK', encode(sha256('pw_blank'::bytea), 'hex'))$$, '23514'::char(5), null, 'a blank name is refused');
select throws_ok($$insert into public.shortcut_keys (name, account_id, currency, key_hash)
  values ('Plain', 'a3000000-0000-4000-8000-0000000000a1', 'LAK', 'pw_keyA')$$, '23514'::char(5), null, 'a key that is not a hash is refused');
select lives_ok($$insert into public.shortcut_keys (name, account_id, currency, key_hash) values
  ('iPad', 'a3000000-0000-4000-8000-0000000000a2', 'LAK', encode(sha256('pw_keyOld'::bytea), 'hex')),
  ('Spare', 'a3000000-0000-4000-8000-0000000000a1', 'LAK', encode(sha256('pw_keySpare'::bytea), 'hex'))$$, 'A makes a second and third key');
select throws_ok($$insert into public.shortcut_keys (name, account_id, currency, key_hash)
  values ('Fourth', 'a3000000-0000-4000-8000-0000000000a1', 'LAK', encode(sha256('pw_key4'::bytea), 'hex'))$$, 'P0001'::char(5), 'shortcut_key_limit', 'a fourth key is refused');
update public.accounts set archived_at = now() where id = 'a3000000-0000-4000-8000-0000000000a2';
insert into public.trips (id, name, starts_on, ends_on)
  values ('a4000000-0000-4000-8000-0000000000a1', 'This week', (now() at time zone 'Asia/Vientiane')::date - 1, (now() at time zone 'Asia/Vientiane')::date + 1);

-- B sees nothing of A and can't use A's account or keys
set local request.jwt.claim.sub = 'b8b8b8b8-b8b8-4b8b-8b8b-b8b8b8b8b8b8';
select is((select count(*) from public.shortcut_keys), 0::bigint, 'B sees none of A''s keys');
select throws_ok($$insert into public.shortcut_keys (name, account_id, currency, key_hash)
  values ('Steal', 'a3000000-0000-4000-8000-0000000000a1', 'LAK', encode(sha256('pw_keyB'::bytea), 'hex'))$$, '23503'::char(5), null, 'B cannot make a key for A''s account');
select lives_ok($$delete from public.shortcut_keys where name = 'iPhone'$$, 'B''s delete of A''s key runs');

-- The Shortcut calls as anon, with nothing but the key
reset role;
set local role anon;
set local request.jwt.claim.sub = '';
select is(public.shortcut_key_currency('pw_keyA'), 'LAK'::char(3), 'a known key gives its account''s currency');
select is(public.shortcut_key_currency('pw_nope'), null, 'an unknown key gives nothing');
select is(public.shortcut_add_expense('pw_nope', 100, 'Food', null) ->> 'status', 'bad_key', 'an unknown key adds nothing');
select is(public.shortcut_add_expense('pw_keyA', 0, 'Food', null) ->> 'status', 'bad_amount', 'a zero amount is refused');
select is(public.shortcut_add_expense('pw_keyA', 2500000, 'fOOd', 'Noodles') ->> 'status', 'saved', 'an expense is saved, the category matched without case');
select is(public.shortcut_add_expense('pw_keyA', 2500000, 'Food', 'Noodles') ->> 'status', 'duplicate', 'the same entry again within a minute is refused');
select is(public.shortcut_add_expense('pw_keyA', 990000, 'Lunch money', null) ->> 'category', 'Other', 'an unknown category saves as Other');
select is(public.shortcut_add_expense('pw_keyOld', 100, 'Food', null) ->> 'status', 'account_archived', 'a key on an archived account adds nothing');

reset role;
select is(
  (select row(user_id, amount_minor, currency, transaction_date, trip_id)::text from public.transactions where description = 'Noodles'),
  row('a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8'::uuid, -2500000::bigint, 'LAK'::char(3), (now() at time zone 'Asia/Vientiane')::date, 'a4000000-0000-4000-8000-0000000000a1'::uuid)::text,
  'the entry is A''s, negative, in kip, dated today in A''s time zone and inside the trip');
select is((select c.name from public.transactions t join public.categories c on c.id = t.category_id where t.description = 'Noodles'), 'Food', 'the entry has the Food category');
select is((select count(*) from public.transaction_audit a join public.transactions t on t.id = a.transaction_id where t.description = 'Noodles'), 1::bigint, 'the audit log has the new entry');
select is((select row(uses_in_window, last_used_at is not null)::text from public.shortcut_keys where name = 'iPhone'), row(2, true)::text, 'the key counts its 2 uses and when it was last used');

-- 30 an hour, then refused until the hour is over
update public.shortcut_keys set uses_in_window = 30, window_started_at = now() - interval '10 minutes' where name = 'iPhone';
set local role anon;
select is(public.shortcut_add_expense('pw_keyA', 300, 'Food', null) ->> 'status', 'too_many', 'the 31st entry in an hour is refused');
reset role;
update public.shortcut_keys set window_started_at = now() - interval '61 minutes' where name = 'iPhone';
set local role anon;
select is(public.shortcut_add_expense('pw_keyA', 300, 'Food', null) ->> 'status', 'saved', 'a new hour starts a new count');
reset role;
select is((select uses_in_window from public.shortcut_keys where name = 'iPhone'), 1, 'the count started again at 1');

-- Without an Other category an unknown name is refused
update public.categories set archived_at = now() where user_id = 'a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8' and kind = 'expense' and name = 'Other';
set local role anon;
select is(public.shortcut_add_expense('pw_keyA', 400, 'Lunch money', null) ->> 'status', 'no_category', 'no match and no Other saves nothing');
reset role;

-- B's delete earlier reached nothing
set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8';
select is((select count(*) from public.shortcut_keys), 3::bigint, 'A still has all 3 keys');

select * from finish();
rollback;
