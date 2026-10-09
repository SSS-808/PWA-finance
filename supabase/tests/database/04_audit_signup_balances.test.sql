begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- Sign-up trigger: a new auth user gets a profile and the default categories
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@audit.test');

select is((select base_currency::text from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'LAK', 'the new profile has base currency LAK');
select is((select timezone from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'Asia/Vientiane', 'the new profile has time zone Asia/Vientiane');
select is((select count(*) from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense'), 9::bigint, 'the new user gets 9 expense categories');
select is((select count(*) from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'income'), 6::bigint, 'the new user gets 6 income categories');

insert into public.accounts (id, user_id, name, type, currency) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Audit', 'cash', 'LAK'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Balances', 'bank', 'LAK'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Empty', 'cash', 'LAK');

-- Audit trail: insert, update and soft delete each write a row
insert into public.transactions (id, user_id, account_id, category_id, kind, amount_minor, currency, description, transaction_date) values
  ('aaaaaaaa-1111-4111-8111-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001',
   (select id from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense' and name = 'Food'),
   'expense', -1000, 'LAK', 'first', current_date);

select is((select action from public.transaction_audit where transaction_id = 'aaaaaaaa-1111-4111-8111-000000000001' order by id desc limit 1), 'insert', 'an insert writes an audit row with action insert');
select ok((select old_row is null from public.transaction_audit where transaction_id = 'aaaaaaaa-1111-4111-8111-000000000001' order by id desc limit 1), 'the insert audit row has a null old_row');
select is((select new_row->>'description' from public.transaction_audit where transaction_id = 'aaaaaaaa-1111-4111-8111-000000000001' order by id desc limit 1), 'first', 'the insert audit row holds the new row');

update public.transactions set description = 'second' where id = 'aaaaaaaa-1111-4111-8111-000000000001';

select is((select action from public.transaction_audit where transaction_id = 'aaaaaaaa-1111-4111-8111-000000000001' order by id desc limit 1), 'update', 'an update writes an audit row with action update');
select ok(
  (select old_row->>'description' = 'first' and new_row->>'description' = 'second'
     from public.transaction_audit where transaction_id = 'aaaaaaaa-1111-4111-8111-000000000001' order by id desc limit 1),
  'the update audit row holds both the old and the new row');

update public.transactions set deleted_at = now() where id = 'aaaaaaaa-1111-4111-8111-000000000001';

select is((select action from public.transaction_audit where transaction_id = 'aaaaaaaa-1111-4111-8111-000000000001' order by id desc limit 1), 'update', 'a soft delete writes an audit row with action update');
select ok(
  (select new_row->>'deleted_at' is not null and old_row->>'deleted_at' is null
     from public.transaction_audit where transaction_id = 'aaaaaaaa-1111-4111-8111-000000000001' order by id desc limit 1),
  'the soft-delete audit row has deleted_at set only in new_row');
select is((select count(*) from public.transaction_audit where transaction_id = 'aaaaaaaa-1111-4111-8111-000000000001'), 3::bigint, 'the transaction has exactly 3 audit rows');

-- Only the trigger writes audit rows; the user can read their own
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is((select count(*) from public.transaction_audit where transaction_id = 'aaaaaaaa-1111-4111-8111-000000000001'), 3::bigint, 'the user can read their own audit rows');
select throws_ok(
  $$insert into public.transaction_audit (transaction_id, user_id, action, new_row)
    values ('aaaaaaaa-1111-4111-8111-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'insert', '{}')$$,
  '42501'::char(5), null, 'an authenticated user cannot insert into transaction_audit');

reset role;

-- updated_at is maintained by the trigger even when the update tries to set it
update public.transactions set updated_at = '2000-01-01' where id = 'aaaaaaaa-1111-4111-8111-000000000001';
update public.accounts set updated_at = '2000-01-01' where id = 'aaaaaaaa-0000-4000-8000-000000000001';
update public.categories set updated_at = '2000-01-01' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense' and name = 'Food';
update public.profiles set updated_at = '2000-01-01' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select isnt((select updated_at from public.transactions where id = 'aaaaaaaa-1111-4111-8111-000000000001'), '2000-01-01'::timestamptz, 'transactions.updated_at is maintained');
select isnt((select updated_at from public.accounts where id = 'aaaaaaaa-0000-4000-8000-000000000001'), '2000-01-01'::timestamptz, 'accounts.updated_at is maintained');
select isnt((select updated_at from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense' and name = 'Food'), '2000-01-01'::timestamptz, 'categories.updated_at is maintained');
select isnt((select updated_at from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), '2000-01-01'::timestamptz, 'profiles.updated_at is maintained');

-- Balances: the sum of non-deleted rows; empty accounts show 0
insert into public.transactions (id, user_id, account_id, category_id, kind, amount_minor, currency, transaction_date, deleted_at) values
  ('aaaaaaaa-2222-4222-8222-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000002', null, 'opening_balance', 1000, 'LAK', current_date, null),
  ('aaaaaaaa-2222-4222-8222-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000002',
   (select id from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense' and name = 'Food'), 'expense', -250, 'LAK', current_date, null),
  ('aaaaaaaa-2222-4222-8222-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000002',
   (select id from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense' and name = 'Shopping'), 'expense', -400, 'LAK', current_date, now());

select is((select balance_minor from public.account_balances where account_id = 'aaaaaaaa-0000-4000-8000-000000000002'), 750::bigint, 'the balance is the sum of the non-deleted rows (the deleted -400 is excluded)');
select is((select balance_minor from public.account_balances where account_id = 'aaaaaaaa-0000-4000-8000-000000000003'), 0::bigint, 'an account with no transactions shows balance 0');

update public.transactions set deleted_at = now() where id = 'aaaaaaaa-2222-4222-8222-000000000002';

select is((select balance_minor from public.account_balances where account_id = 'aaaaaaaa-0000-4000-8000-000000000002'), 1000::bigint, 'soft-deleting a row removes it from the balance');

select * from finish();
rollback;
