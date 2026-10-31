begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'e@minimum.test');

-- Sign-up: the default categories now include "Bank fees" with the bank icon
select is((select icon || '/' || color from public.categories where user_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' and kind = 'expense' and name = 'Bank fees'), 'landmark/gray', 'a new user gets the grey bank "Bank fees" category');
select is((select count(*) from public.categories where user_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'), 16::bigint, 'a new user gets 16 default categories');

set local role authenticated;
set local request.jwt.claim.sub = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

-- The minimum starts at 0 and can't be negative
insert into public.accounts (name, type, currency) values ('Wallet', 'cash', 'LAK');
select is((select minimum_minor from public.accounts where name = 'Wallet'), 0::bigint, 'an account without a minimum starts at 0');
select throws_ok($$update public.accounts set minimum_minor = -1 where name = 'Wallet'$$, '23514'::char(5), null, 'a negative minimum is refused');

-- A debt has no minimum
select throws_ok($$insert into public.accounts (name, type, currency, minimum_minor) values ('Card', 'credit_card', 'USD', 1000)$$, '23514'::char(5), null, 'a credit card with a minimum is refused');
select throws_ok($$insert into public.accounts (name, type, currency, minimum_minor) values ('Loan', 'loan', 'LAK', 50000)$$, '23514'::char(5), null, 'a loan with a minimum is refused');

-- create_account and update_account store the minimum
select lives_ok($$select public.create_account('BCEL', 'bank', 'LAK', 1000000, current_date, 50000)$$, 'create_account takes a minimum');
select is((select minimum_minor from public.accounts where name = 'BCEL'), 50000::bigint, 'the minimum is stored');
select lives_ok($$select public.update_account((select id from public.accounts where name = 'BCEL'), 'BCEL', 'bank', 1000000, current_date, 80000)$$, 'update_account takes a minimum');
select is((select minimum_minor from public.accounts where name = 'BCEL'), 80000::bigint, 'the minimum is changed');

-- The bank icon is allowed for any category
select lives_ok($$insert into public.categories (name, kind, icon) values ('ATM', 'expense', 'landmark')$$, 'the landmark icon is accepted');

select * from finish();
rollback;
