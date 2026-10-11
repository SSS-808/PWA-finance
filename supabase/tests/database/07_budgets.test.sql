begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Setup as postgres: users A and B (the sign-up trigger creates profiles and categories)
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@budgets.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@budgets.test');

-- Category ids are remembered here, because under RLS a user cannot look up someone else's
select set_config('test.a_food', (select id::text from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense' and name = 'Food'), true);
select set_config('test.a_salary', (select id::text from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'income' and name = 'Salary'), true);
select set_config('test.b_food', (select id::text from public.categories where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and kind = 'expense' and name = 'Food'), true);

select is((select relrowsecurity from pg_class where oid = 'public.budgets'::regclass), true, 'row level security is on for budgets');

-- User A: what is allowed
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$insert into public.budgets (category_id, currency, start_month, amount_minor)
    values (current_setting('test.a_food')::uuid, 'LAK', '2026-10-01', 2000000)$$,
  'A can add a budget, and user_id is filled in for them');
select is((select count(*) from public.budgets where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1::bigint, 'A sees their own budget');
select lives_ok(
  $$update public.budgets set amount_minor = 2500000 where category_id = current_setting('test.a_food')::uuid and currency = 'LAK' and start_month = '2026-10-01'$$,
  'A can change their own budget');
select lives_ok(
  $$insert into public.budgets (category_id, currency, start_month, amount_minor)
    values (current_setting('test.a_food')::uuid, 'THB', '2026-10-01', 150000)$$,
  'the same category can have a second budget in another currency');
select lives_ok(
  $$insert into public.budgets (category_id, currency, start_month, amount_minor)
    values (current_setting('test.a_food')::uuid, 'LAK', '2026-12-01', 0)$$,
  'an amount of 0 is accepted (it ends the budget from that month on)');

-- User A: what the constraints refuse
select throws_ok(
  $$insert into public.budgets (category_id, currency, start_month, amount_minor)
    values (current_setting('test.a_food')::uuid, 'LAK', '2026-10-01', 1)$$,
  '23505'::char(5), null, 'a second row for the same category, currency and month is refused');
select throws_ok(
  $$insert into public.budgets (category_id, currency, start_month, amount_minor)
    values (current_setting('test.a_food')::uuid, 'LAK', '2026-11-15', 1)$$,
  '23514'::char(5), null, 'a start_month that is not the first day of a month is refused');
select throws_ok(
  $$insert into public.budgets (category_id, currency, start_month, amount_minor)
    values (current_setting('test.a_food')::uuid, 'LAK', '2026-11-01', -1)$$,
  '23514'::char(5), null, 'a negative amount is refused');
select throws_ok(
  $$insert into public.budgets (category_id, currency, start_month, amount_minor)
    values (current_setting('test.a_food')::uuid, 'LAK', '2026-11-01', 10000000000001)$$,
  '23514'::char(5), null, 'an amount above the limit is refused');
select throws_ok(
  $$insert into public.budgets (category_id, currency, start_month, amount_minor)
    values (current_setting('test.a_salary')::uuid, 'LAK', '2026-11-01', 1)$$,
  '23503'::char(5), null, 'a budget on an income category is refused');
select throws_ok(
  $$insert into public.budgets (category_id, kind, currency, start_month, amount_minor)
    values (current_setting('test.a_salary')::uuid, 'income', 'LAK', '2026-11-01', 1)$$,
  '23514'::char(5), null, 'kind can only be expense');
select throws_ok(
  $$insert into public.budgets (category_id, currency, start_month, amount_minor)
    values (current_setting('test.a_food')::uuid, 'EUR', '2026-11-01', 1)$$,
  '23503'::char(5), null, 'an unknown currency is refused');
select throws_ok(
  $$insert into public.budgets (category_id, currency, start_month, amount_minor)
    values (current_setting('test.b_food')::uuid, 'LAK', '2026-11-01', 1)$$,
  '23503'::char(5), null, 'A cannot budget on a category of B (composite FK)');
select throws_ok(
  $$delete from public.budgets where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501'::char(5), null, 'A cannot delete a budget (no delete permission)');

-- User B: the budgets of A are out of reach
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is((select count(*) from public.budgets), 0::bigint, 'B cannot see the budgets of A');
select throws_ok(
  $$insert into public.budgets (user_id, category_id, currency, start_month, amount_minor)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_setting('test.a_food')::uuid, 'USD', '2026-10-01', 1)$$,
  '42501'::char(5), null, 'B cannot add a budget for A');
select lives_ok(
  $$update public.budgets set amount_minor = 1 where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'B updating the budgets of A runs without error (it matches no rows)');
select lives_ok(
  $$insert into public.budgets (category_id, currency, start_month, amount_minor)
    values (current_setting('test.b_food')::uuid, 'LAK', '2026-10-01', 500000)$$,
  'B can add their own budget');

-- Logged-out visitors get nothing at all
set local role anon;
select throws_ok(
  $$select count(*) from public.budgets$$,
  '42501'::char(5), null, 'anon cannot read budgets');

-- Back as postgres: the update attempt by B changed nothing
reset role;
select is(
  (select amount_minor from public.budgets where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and currency = 'LAK' and start_month = '2026-10-01'),
  2500000::bigint, 'the budget of A still has the amount A set');
select is((select count(*) from public.budgets), 4::bigint, 'four budgets exist: three of A and one of B');

select * from finish();
rollback;
