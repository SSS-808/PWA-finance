begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- Setup as postgres: users A and B (the sign-up trigger creates profiles and categories)
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@rls.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@rls.test');

insert into public.accounts (id, user_id, name, type, currency) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A Cash', 'cash', 'LAK'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B Cash', 'cash', 'LAK');

insert into public.transactions (id, user_id, account_id, category_id, kind, amount_minor, currency, description, transaction_date) values
  ('aaaaaaaa-1111-4111-8111-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001',
   (select id from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense' and name = 'Food'),
   'expense', -45000, 'LAK', 'Lunch', current_date);

-- Positive controls: user A sees their own rows
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is((select count(*) from public.accounts where id = 'aaaaaaaa-0000-4000-8000-000000000001'), 1::bigint, 'A sees their own account');
select is((select count(*) from public.transactions where id = 'aaaaaaaa-1111-4111-8111-000000000001'), 1::bigint, 'A sees their own transaction');
select is((select count(*) from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 15::bigint, 'A sees their own 15 categories');
select is((select count(*) from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1::bigint, 'A sees their own profile');
select is((select count(*) from public.account_balances where account_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 1::bigint, 'A sees their own account_balances row');
select is((select count(*) from public.transaction_audit where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1::bigint, 'A sees their own audit row');
select is((select count(*) from public.currencies), 3::bigint, 'A sees the 3 currencies');

-- User B: positive controls, then A''s rows must be invisible
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is((select count(*) from public.accounts where id = 'bbbbbbbb-0000-4000-8000-000000000001'), 1::bigint, 'B sees their own account');
select is((select count(*) from public.categories where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 15::bigint, 'B sees their own 15 categories');
select is((select count(*) from public.profiles where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 1::bigint, 'B sees their own profile');

select is((select count(*) from public.accounts where id = 'aaaaaaaa-0000-4000-8000-000000000001'), 0::bigint, 'B cannot see A''s account');
select is((select count(*) from public.transactions where id = 'aaaaaaaa-1111-4111-8111-000000000001'), 0::bigint, 'B cannot see A''s transaction');
select is((select count(*) from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0::bigint, 'B cannot see A''s categories');
select is((select count(*) from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0::bigint, 'B cannot see A''s profile');
select is((select count(*) from public.account_balances where account_id = 'aaaaaaaa-0000-4000-8000-000000000001'), 0::bigint, 'B cannot see A''s account_balances row');
select is((select count(*) from public.transaction_audit where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0::bigint, 'B cannot see A''s audit rows');

select throws_ok(
  $$insert into public.accounts (user_id, name, type, currency) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Planted', 'cash', 'LAK')$$,
  '42501'::char(5), null, 'B cannot insert an account for A');

select lives_ok(
  $$update public.accounts set name = 'Hacked' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  'B updating A''s account runs without error (it matches no rows)');

select throws_ok(
  $$insert into public.transactions (user_id, account_id, kind, amount_minor, currency, transaction_date) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-0000-4000-8000-000000000001', 'adjustment', 100, 'LAK', current_date)$$,
  '23503'::char(5), null, 'B cannot attach a transaction to A''s account (composite FK)');

select lives_ok(
  $$update public.accounts set name = 'B Renamed' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  'B can update their own account');

-- Anonymous visitors see nothing
set local role anon;

select is((select count(*) from public.accounts), 0::bigint, 'anon sees no accounts');
select is((select count(*) from public.transactions), 0::bigint, 'anon sees no transactions');
select is((select count(*) from public.currencies), 0::bigint, 'anon sees no currencies');
select is((select count(*) from public.account_balances), 0::bigint, 'anon sees no account_balances');

-- No delete policy: A cannot hard-delete a transaction
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$delete from public.transactions where id = 'aaaaaaaa-1111-4111-8111-000000000001'$$,
  'A deleting their own transaction runs without error (no delete policy, so it matches no rows)');

-- Back as postgres: check what really happened
reset role;

select is((select name from public.accounts where id = 'aaaaaaaa-0000-4000-8000-000000000001'), 'A Cash', 'A''s account name is unchanged');
select is((select name from public.accounts where id = 'bbbbbbbb-0000-4000-8000-000000000001'), 'B Renamed', 'B''s own update did apply');
select is((select count(*) from public.transactions where id = 'aaaaaaaa-1111-4111-8111-000000000001'), 1::bigint, 'A''s transaction still exists after the delete attempt');

select * from finish();
rollback;
