begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Setup as postgres: users A and B, with explicit user_id on every insert
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@constraints.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@constraints.test');

insert into public.accounts (id, user_id, name, type, currency) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Cash', 'cash', 'LAK'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Empty USD', 'cash', 'USD');

-- Positive controls: valid income and expense rows are accepted
select lives_ok(
  $$insert into public.transactions (user_id, account_id, category_id, kind, amount_minor, currency, transaction_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001',
            (select id from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'income' and name = 'Salary'),
            'income', 100, 'LAK', current_date)$$,
  'a valid income row is accepted');
select lives_ok(
  $$insert into public.transactions (user_id, account_id, category_id, kind, amount_minor, currency, transaction_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001',
            (select id from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense' and name = 'Food'),
            'expense', -100, 'LAK', current_date)$$,
  'a valid expense row is accepted');

-- Sign and amount rules
select throws_ok(
  $$insert into public.transactions (user_id, account_id, category_id, kind, amount_minor, currency, transaction_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001',
            (select id from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense' and name = 'Food'),
            'expense', 100, 'LAK', current_date)$$,
  '23514'::char(5), null, 'an expense with a positive amount is refused');
select throws_ok(
  $$insert into public.transactions (user_id, account_id, category_id, kind, amount_minor, currency, transaction_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001',
            (select id from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'income' and name = 'Salary'),
            'income', -100, 'LAK', current_date)$$,
  '23514'::char(5), null, 'an income with a negative amount is refused');
select throws_ok(
  $$insert into public.transactions (user_id, account_id, kind, amount_minor, currency, transaction_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'adjustment', 0, 'LAK', current_date)$$,
  '23514'::char(5), null, 'an amount of 0 is refused');

-- Composite foreign keys
select throws_ok(
  $$insert into public.transactions (user_id, account_id, kind, amount_minor, currency, transaction_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'adjustment', 100, 'USD', current_date)$$,
  '23503'::char(5), null, 'a USD transaction in a LAK account is refused');
select throws_ok(
  $$insert into public.transactions (user_id, account_id, category_id, kind, amount_minor, currency, transaction_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001',
            (select id from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'income' and name = 'Salary'),
            'expense', -100, 'LAK', current_date)$$,
  '23503'::char(5), null, 'an expense using an income category is refused');

-- Category and transfer_id rules
select throws_ok(
  $$insert into public.transactions (user_id, account_id, kind, amount_minor, currency, transaction_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'income', 100, 'LAK', current_date)$$,
  '23514'::char(5), null, 'an income without a category is refused');
select throws_ok(
  $$insert into public.transactions (user_id, account_id, kind, amount_minor, currency, transaction_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'transfer', -100, 'LAK', current_date)$$,
  '23514'::char(5), null, 'a transfer without a transfer_id is refused');

-- One opening balance per account
select lives_ok(
  $$insert into public.transactions (user_id, account_id, kind, amount_minor, currency, transaction_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'opening_balance', 1000, 'LAK', current_date)$$,
  'the first opening_balance on an account is accepted');
select throws_ok(
  $$insert into public.transactions (user_id, account_id, kind, amount_minor, currency, transaction_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'opening_balance', 2000, 'LAK', current_date)$$,
  '23505'::char(5), null, 'a second opening_balance on the same account is refused');

-- Currency of an account with transactions is locked
select throws_ok(
  $$update public.accounts set currency = 'USD' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '23503'::char(5), null, 'changing the currency of an account that has transactions is refused');
select lives_ok(
  $$update public.accounts set currency = 'THB' where id = 'aaaaaaaa-0000-4000-8000-000000000002'$$,
  'changing the currency of an account with no transactions is accepted');

-- Account names are unique per user, ignoring case
select throws_ok(
  $$insert into public.accounts (user_id, name, type, currency) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CASH', 'cash', 'LAK')$$,
  '23505'::char(5), null, 'a duplicate active account name differing only in case is refused');
select lives_ok(
  $$insert into public.accounts (user_id, name, type, currency) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Cash', 'cash', 'LAK')$$,
  'the same account name for another user is accepted');

-- Mirrors src/modules/money/domain/currency.ts
select results_eq(
  $$select code::text, minor_unit::int from public.currencies order by code$$,
  $$values ('LAK'::text, 0), ('THB'::text, 2), ('USD'::text, 2)$$,
  'currencies holds exactly LAK 0, THB 2, USD 2');

select * from finish();
rollback;
