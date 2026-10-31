begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('12121212-1212-4121-8121-121212121212', 'h@release.test'),
  ('34343434-3434-4343-8343-343434343434', 'i@release.test');

set local role authenticated;
set local request.jwt.claim.sub = '12121212-1212-4121-8121-121212121212';

select set_config('test.bcel', public.create_account('BCEL', 'bank', 'LAK', 1000000, current_date, 50000)::text, true);
insert into public.goals (id, name, currency, target_minor) values
  ('a1000000-0000-4000-8000-000000000001', 'Laptop', 'LAK', 5000000),
  ('a1000000-0000-4000-8000-000000000002', 'Trip', 'LAK', 5000000);
insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on, account_id) values
  ('a1000000-0000-4000-8000-000000000001', 'LAK', 600000, current_date, current_setting('test.bcel')::uuid),
  ('a1000000-0000-4000-8000-000000000002', 'LAK', 300000, current_date, current_setting('test.bcel')::uuid);

-- Balance 1,000,000 − minimum 50,000 = 950,000 holds the 900,000 set aside: nothing to take
select is(public.release_goal_shortfall(current_setting('test.bcel')::uuid, null, current_date), 0::bigint, 'nothing is taken while the account holds the goal money');

-- Balance 900,000: it holds 850,000, so 50,000 comes out of Laptop, the goal with the most
select public.update_account(current_setting('test.bcel')::uuid, 'BCEL', 'bank', 900000, current_date, 50000);
select is(public.release_goal_shortfall(current_setting('test.bcel')::uuid, null, current_date), 50000::bigint, 'the missing 50,000 is taken out');
select is((select sum(amount_minor)::bigint from public.goal_contributions where goal_id = 'a1000000-0000-4000-8000-000000000001'), 550000::bigint, 'Laptop gave it, as the goal with the most there');
select is((select set_aside_minor from public.account_set_aside where account_id = current_setting('test.bcel')::uuid), 850000::bigint, 'the account now holds exactly what is set aside');

-- Balance 400,000: 500,000 is missing and comes out of Laptop first
select public.update_account(current_setting('test.bcel')::uuid, 'BCEL', 'bank', 400000, current_date, 50000);
select is(public.release_goal_shortfall(current_setting('test.bcel')::uuid, null, current_date), 500000::bigint, 'the missing 500,000 is taken out');
select is((select sum(amount_minor)::bigint from public.goal_contributions where goal_id = 'a1000000-0000-4000-8000-000000000002'), 300000::bigint, 'Trip still has all of its money');

-- Balance 100,000 and only Trip asked: Trip gives the 300,000 missing, Laptop keeps its 50,000
select public.update_account(current_setting('test.bcel')::uuid, 'BCEL', 'bank', 100000, current_date, 50000);
select is(public.release_goal_shortfall(current_setting('test.bcel')::uuid, 'a1000000-0000-4000-8000-000000000002', current_date), 300000::bigint, 'only the named goal gives');
select is((select sum(amount_minor)::bigint from public.goal_contributions where goal_id = 'a1000000-0000-4000-8000-000000000001'), 50000::bigint, 'Laptop keeps its money');

-- Someone else's account can't be touched
set local request.jwt.claim.sub = '34343434-3434-4343-8343-343434343434';
select throws_ok(format('select public.release_goal_shortfall(%L::uuid, null, current_date)', current_setting('test.bcel')), 'P0002', null, 'another user''s account is not found');

reset role;
select is((select count(*) from public.goal_contributions where account_id = current_setting('test.bcel')::uuid), 5::bigint, 'two goals added money, and three rows took it back out');

select * from finish();
rollback;
