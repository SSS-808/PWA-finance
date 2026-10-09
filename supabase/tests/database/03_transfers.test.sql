begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Setup as postgres: user A with three accounts, user B with one
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@transfers.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@transfers.test');

insert into public.accounts (id, user_id, name, type, currency) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Cash', 'cash', 'LAK'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BCEL', 'bank', 'LAK'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'USD Cash', 'cash', 'USD'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B Cash', 'cash', 'LAK');

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- Same-currency transfer: BCEL to Cash, 500000 LAK
select lives_ok(
  $$select set_config('test.same_ccy', public.create_transfer('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 500000, 500000, current_date, 'ATM withdrawal')::text, true)$$,
  'create_transfer accepts a same-currency transfer');
select is(
  (select count(*) from public.transactions where transfer_id = current_setting('test.same_ccy')::uuid),
  2::bigint, 'a same-currency transfer writes 2 legs with the same transfer_id');
select results_eq(
  $$select account_id, amount_minor from public.transactions where transfer_id = current_setting('test.same_ccy')::uuid order by amount_minor$$,
  $$values ('aaaaaaaa-0000-4000-8000-000000000002'::uuid, -500000::bigint), ('aaaaaaaa-0000-4000-8000-000000000001'::uuid, 500000::bigint)$$,
  'the legs are -X on the source account and +X on the target account');

-- Exchange transfer: USD Cash to Cash, 100.00 USD for 2150000 LAK
select lives_ok(
  $$select set_config('test.fx', public.create_transfer('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 10000, 2150000, current_date, 'Money changer')::text, true)$$,
  'create_transfer accepts an exchange between two currencies');
select is(
  (select count(*) from public.transactions where transfer_id = current_setting('test.fx')::uuid),
  2::bigint, 'an exchange writes 2 legs with the same transfer_id');
select results_eq(
  $$select currency::text, amount_minor from public.transactions where transfer_id = current_setting('test.fx')::uuid order by amount_minor$$,
  $$values ('USD'::text, -10000::bigint), ('LAK'::text, 2150000::bigint)$$,
  'the exchange legs are -10000 USD and +2150000 LAK');

-- Run the deferred balance check now; both valid transfers must pass
set constraints all immediate;

select throws_ok(
  $$select public.create_transfer('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 1000, 2000, current_date)$$,
  '22023'::char(5), null, 'same-currency amounts that differ are refused');
select throws_ok(
  $$select public.create_transfer('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 1000, 1000, current_date)$$,
  '22023'::char(5), null, 'a transfer to the same account is refused');
select throws_ok(
  $$select public.create_transfer('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 0, 0, current_date)$$,
  '22023'::char(5), null, 'a transfer of 0 is refused');
select throws_ok(
  $$select public.create_transfer('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 1000, 1000, current_date)$$,
  'P0002'::char(5), null, 'a transfer to another user''s account is refused');

-- The safety-net trigger refuses unbalanced transfers
select throws_ok(
  $$insert into public.transactions (account_id, kind, amount_minor, currency, transaction_date, transfer_id)
    values ('aaaaaaaa-0000-4000-8000-000000000001', 'transfer', -100, 'LAK', current_date, gen_random_uuid())$$,
  '23514'::char(5), null, 'a single direct transfer leg is refused');
select throws_ok(
  $$update public.transactions set deleted_at = now()
    where transfer_id = current_setting('test.same_ccy')::uuid and amount_minor < 0$$,
  '23514'::char(5), null, 'soft-deleting only one leg of a transfer is refused');
select throws_ok(
  $$update public.transactions set amount_minor = -600000
    where transfer_id = current_setting('test.same_ccy')::uuid and amount_minor < 0$$,
  '23514'::char(5), null, 'changing one leg of a same-currency transfer is refused');

-- Both legs together are fine
select lives_ok(
  $$update public.transactions set deleted_at = now() where transfer_id = current_setting('test.same_ccy')::uuid$$,
  'soft-deleting both legs in one update is accepted');
select is(
  (select count(*) from public.transactions where transfer_id = current_setting('test.same_ccy')::uuid and deleted_at is not null),
  2::bigint, 'both legs are soft-deleted, not removed');

-- Anonymous visitors cannot call the function
set local role anon;
select throws_ok(
  $$select public.create_transfer('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 1000, 1000, current_date)$$,
  '42501'::char(5), null, 'anon cannot execute create_transfer');

select * from finish();
rollback;
