begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@transfer-fns.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@transfer-fns.test');

insert into public.accounts (id, user_id, name, type, currency, archived_at) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Cash', 'cash', 'LAK', null),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'BCEL', 'bank', 'LAK', null),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'USD Cash', 'cash', 'USD', null),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Old card', 'credit_card', 'LAK', now()),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B Cash', 'cash', 'LAK', null),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B Bank', 'bank', 'LAK', null);

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select set_config('test.t1',
  public.create_transfer('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 500000, 500000, current_date)::text,
  true);

-- update_transfer
select lives_ok(
  $$select public.update_transfer(current_setting('test.t1')::uuid,
      'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 600000, 600000, current_date, 'ATM')$$,
  'update_transfer changes the amount on both sides');
select results_eq(
  $$select account_id, amount_minor, description from public.transactions
     where transfer_id = current_setting('test.t1')::uuid and deleted_at is null order by amount_minor$$,
  $$values ('aaaaaaaa-0000-4000-8000-000000000002'::uuid, -600000::bigint, 'ATM'::text),
           ('aaaaaaaa-0000-4000-8000-000000000001'::uuid, 600000::bigint, 'ATM'::text)$$,
  'both legs carry the new amount and note');
select lives_ok(
  $$select public.update_transfer(current_setting('test.t1')::uuid,
      'aaaaaaaa-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 10000, 2150000, current_date)$$,
  'a transfer can be turned into a currency exchange');
select results_eq(
  $$select currency::text, amount_minor from public.transactions
     where transfer_id = current_setting('test.t1')::uuid and deleted_at is null order by amount_minor$$,
  $$values ('USD'::text, -10000::bigint), ('LAK'::text, 2150000::bigint)$$,
  'the legs now have their own currencies and amounts');
select is(
  (select balance_minor from public.account_balances where account_id = 'aaaaaaaa-0000-4000-8000-000000000002'),
  0::bigint, 'BCEL is back to 0 after it left the transfer');
select lives_ok('set constraints all immediate', 'the edited transfer still passes the balance check');
select is(
  (select count(*) from public.transaction_audit a
     join public.transactions t on t.id = a.transaction_id
    where t.transfer_id = current_setting('test.t1')::uuid and a.action = 'update'),
  4::bigint, 'two edits of two legs leave 4 history rows');
set constraints all deferred;

select throws_ok(
  $$select public.update_transfer(current_setting('test.t1')::uuid,
      'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 1000, 2000, current_date)$$,
  '22023'::char(5), null, 'same-currency amounts that differ are refused');
select throws_ok(
  $$select public.update_transfer(current_setting('test.t1')::uuid,
      'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 1000, 1000, current_date)$$,
  '22023'::char(5), null, 'the same account on both sides is refused');
select throws_ok(
  $$select public.update_transfer(current_setting('test.t1')::uuid,
      'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004', 1000, 1000, current_date)$$,
  'P0002'::char(5), null, 'an archived account is refused');
select throws_ok(
  $$select public.update_transfer(gen_random_uuid(),
      'aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 1000, 1000, current_date)$$,
  'P0002'::char(5), null, 'an unknown transfer is "not found"');

-- delete_transfer
select lives_ok(
  $$select public.delete_transfer(current_setting('test.t1')::uuid)$$,
  'delete_transfer works');
select is(
  (select count(*) from public.transactions
    where transfer_id = current_setting('test.t1')::uuid and deleted_at is not null),
  2::bigint, 'both legs are soft-deleted, not erased');
select is(
  (select balance_minor from public.account_balances where account_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  0::bigint, 'Cash no longer counts the deleted transfer');
select lives_ok('set constraints all immediate', 'a fully deleted transfer passes the balance check');
set constraints all deferred;
select throws_ok(
  $$select public.delete_transfer(current_setting('test.t1')::uuid)$$,
  'P0002'::char(5), null, 'deleting it again is "not found"');

-- set_account_balance
select is(
  public.set_account_balance('aaaaaaaa-0000-4000-8000-000000000001', 3000000, current_date, 'Counted my cash'),
  3000000::bigint, 'from 0 to 3,000,000 adds an adjustment of +3,000,000');
select is(
  (select balance_minor from public.account_balances where account_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  3000000::bigint, 'the balance is now the target');
select is(
  public.set_account_balance('aaaaaaaa-0000-4000-8000-000000000001', 3000000, current_date),
  0::bigint, 'the same target again changes nothing');
select is(
  (select count(*) from public.transactions
    where account_id = 'aaaaaaaa-0000-4000-8000-000000000001' and kind = 'adjustment'),
  1::bigint, 'so there is still only one adjustment');
select is(
  public.set_account_balance('aaaaaaaa-0000-4000-8000-000000000001', 2950000, current_date),
  -50000::bigint, 'a lower target adds a negative adjustment');
select is(
  (select balance_minor from public.account_balances where account_id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  2950000::bigint, 'the balance follows');
select is(
  public.set_account_balance('aaaaaaaa-0000-4000-8000-000000000003', -2500, current_date),
  -2500::bigint, 'a target below zero works (an overdrawn account)');
select throws_ok(
  $$select public.set_account_balance('aaaaaaaa-0000-4000-8000-000000000004', 100, current_date)$$,
  'P0002'::char(5), null, 'an archived account is refused');

-- Another user, and anonymous visitors
select set_config('test.t2',
  public.create_transfer('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 1000, 1000, current_date)::text,
  true);
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select throws_ok(
  $$select public.update_transfer(current_setting('test.t2')::uuid,
      'bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002', 1, 1, current_date)$$,
  'P0002'::char(5), null, 'B cannot edit A''s transfer, even using B''s own accounts');
select throws_ok(
  $$select public.delete_transfer(current_setting('test.t2')::uuid)$$,
  'P0002'::char(5), null, 'B cannot delete A''s transfer');
select throws_ok(
  $$select public.set_account_balance('aaaaaaaa-0000-4000-8000-000000000001', 1, current_date)$$,
  'P0002'::char(5), null, 'B cannot fix the balance of A''s account');

set local role anon;
select throws_ok(
  $$select public.set_account_balance('aaaaaaaa-0000-4000-8000-000000000001', 1, current_date)$$,
  '42501'::char(5), null, 'anonymous visitors cannot run set_account_balance');

select * from finish();
rollback;
