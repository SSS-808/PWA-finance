begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'f@goalmoney.test'),
  ('99999999-9999-4999-8999-999999999999', 'g@goalmoney.test');

set local role authenticated;
set local request.jwt.claim.sub = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

insert into public.accounts (id, name, type, currency) values
  ('f0000000-0000-4000-8000-000000000001', 'BCEL', 'bank', 'LAK'),
  ('f0000000-0000-4000-8000-000000000002', 'BCEL', 'bank', 'USD'),
  ('f0000000-0000-4000-8000-000000000003', 'Cash', 'cash', 'LAK');
insert into public.goals (id, name, currency, target_minor) values
  ('f1000000-0000-4000-8000-000000000001', 'Laptop', 'LAK', 10000000),
  ('f1000000-0000-4000-8000-000000000002', 'Trip', 'LAK', 5000000);

-- Money set aside in an account of the goal's currency
select lives_ok($$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on, account_id) values ('f1000000-0000-4000-8000-000000000001', 'LAK', 2000000, current_date, 'f0000000-0000-4000-8000-000000000001')$$, 'money is set aside in BCEL in kip');
select throws_ok($$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on, account_id) values ('f1000000-0000-4000-8000-000000000001', 'LAK', 100, current_date, 'f0000000-0000-4000-8000-000000000002')$$, '23503'::char(5), null, 'an account in another currency is refused');
select lives_ok($$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on) values ('f1000000-0000-4000-8000-000000000001', 'LAK', 500000, current_date)$$, 'money without an account is still accepted');

-- Each account's share of a goal can't go below 0
select throws_ok($$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on, account_id) values ('f1000000-0000-4000-8000-000000000001', 'LAK', -100, current_date, 'f0000000-0000-4000-8000-000000000003')$$, '23514'::char(5), null, 'taking out of an account that holds none of the goal is refused');
select throws_ok($$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on, account_id) values ('f1000000-0000-4000-8000-000000000001', 'LAK', -2000001, current_date, 'f0000000-0000-4000-8000-000000000001')$$, '23514'::char(5), null, 'taking out more than an account holds for the goal is refused');
select lives_ok($$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on, account_id) values ('f1000000-0000-4000-8000-000000000001', 'LAK', -500000, current_date, 'f0000000-0000-4000-8000-000000000001')$$, 'taking out part of what an account holds is accepted');

-- The set-aside view adds up active goals per account
insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on, account_id)
values ('f1000000-0000-4000-8000-000000000002', 'LAK', 1000000, current_date, 'f0000000-0000-4000-8000-000000000001');
select is((select set_aside_minor from public.account_set_aside where account_id = 'f0000000-0000-4000-8000-000000000001'), 2500000::bigint, 'BCEL holds 1,500,000 for Laptop and 1,000,000 for Trip');
select is((select count(*) from public.account_set_aside where account_id = 'f0000000-0000-4000-8000-000000000003'), 0::bigint, 'Cash holds nothing for goals');
update public.goals set archived_at = now() where id = 'f1000000-0000-4000-8000-000000000002';
select is((select set_aside_minor from public.account_set_aside where account_id = 'f0000000-0000-4000-8000-000000000001'), 1500000::bigint, 'an archived goal frees its money');

-- Another user sees nothing and can't use these accounts
set local request.jwt.claim.sub = '99999999-9999-4999-8999-999999999999';
select is((select count(*) from public.account_set_aside), 0::bigint, 'another user sees no set-aside money');
insert into public.goals (id, name, currency, target_minor) values ('f1000000-0000-4000-8000-000000000003', 'Bike', 'LAK', 1000000);
select throws_ok($$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on, account_id) values ('f1000000-0000-4000-8000-000000000003', 'LAK', 100, current_date, 'f0000000-0000-4000-8000-000000000001')$$, '23503'::char(5), null, 'another user cannot set money aside in someone else''s account');

select * from finish();
rollback;
