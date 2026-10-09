begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@accounts.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@accounts.test');

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- create_account
select lives_ok(
  $$select set_config('test.cash', public.create_account('Cash', 'cash', 'LAK', 1500000, current_date)::text, true)$$,
  'create_account with a starting amount works');
select results_eq(
  $$select name, type, currency::text from public.accounts where id = current_setting('test.cash')::uuid$$,
  $$values ('Cash'::text, 'cash'::text, 'LAK'::text)$$,
  'the account is saved with its name, type and currency');
select results_eq(
  $$select kind, amount_minor from public.transactions where account_id = current_setting('test.cash')::uuid$$,
  $$values ('opening_balance'::text, 1500000::bigint)$$,
  'one opening_balance row holds the starting amount');
select is(
  (select balance_minor from public.account_balances where account_id = current_setting('test.cash')::uuid),
  1500000::bigint, 'the balance equals the starting amount');

select lives_ok(
  $$select set_config('test.empty', public.create_account('Savings', 'savings', 'LAK', 0, current_date)::text, true)$$,
  'create_account with 0 works');
select is(
  (select count(*) from public.transactions where account_id = current_setting('test.empty')::uuid),
  0::bigint, 'a starting amount of 0 writes no transaction');

select lives_ok(
  $$select set_config('test.visa', public.create_account('Visa', 'credit_card', 'USD', -3000, current_date)::text, true)$$,
  'a debt starts negative');
select is(
  (select balance_minor from public.account_balances where account_id = current_setting('test.visa')::uuid),
  -3000::bigint, 'the card balance is -3000 (you owe $30)');

select throws_ok(
  $$select public.create_account('Broken', 'piggy_bank', 'LAK', 100, current_date)$$,
  '23514'::char(5), null, 'an unknown account type is refused');
select is(
  (select count(*) from public.accounts where name = 'Broken'),
  0::bigint, 'nothing is left behind when create_account fails');
select throws_ok(
  $$select public.create_account('CASH', 'cash', 'LAK', 0, current_date)$$,
  '23505'::char(5), null, 'a duplicate name (any capitals) is refused');

-- update_account
select lives_ok(
  $$select public.update_account(current_setting('test.cash')::uuid, 'Wallet cash', 'cash', 2000000, current_date)$$,
  'update_account renames and changes the starting amount');
select is(
  (select balance_minor from public.account_balances where account_id = current_setting('test.cash')::uuid),
  2000000::bigint, 'the balance follows the new starting amount');
select lives_ok(
  $$select public.update_account(current_setting('test.cash')::uuid, 'Wallet cash', 'cash', 0, current_date)$$,
  'setting the starting amount to 0 works');
select is(
  (select balance_minor from public.account_balances where account_id = current_setting('test.cash')::uuid),
  0::bigint, 'the opening row is soft-deleted, so the balance is 0');
select lives_ok(
  $$select public.update_account(current_setting('test.empty')::uuid, 'Savings', 'savings', 500, current_date)$$,
  'adding a starting amount to an account that had none works');

-- Another user cannot touch it
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select throws_ok(
  $$select public.update_account(current_setting('test.cash')::uuid, 'Hacked', 'cash', 1, current_date)$$,
  'P0002'::char(5), null, 'another user''s account is "not found"');

select * from finish();
rollback;
