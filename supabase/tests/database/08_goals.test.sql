begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

-- Setup as postgres: users A and B (the sign-up trigger creates their profiles)
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@goals.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@goals.test');

select is((select relrowsecurity from pg_class where oid = 'public.goals'::regclass), true, 'row level security is on for goals');
select is((select relrowsecurity from pg_class where oid = 'public.goal_contributions'::regclass), true, 'row level security is on for goal_contributions');

-- User A: what is allowed
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select lives_ok(
  $$insert into public.goals (id, name, currency, target_minor, deadline)
    values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'Laptop', 'LAK', 10000000, '2027-03-31')$$,
  'A can add a goal, and user_id is filled in for them');
select is((select count(*) from public.goals where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1::bigint, 'A sees their own goal');
select lives_ok(
  $$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on)
    values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'LAK', 7000000, '2026-10-12')$$,
  'A can add money to their goal');
select is((select saved_minor from public.goal_totals where goal_id = 'aaaaaaaa-0000-4000-8000-0000000000a1'), 7000000::bigint, 'the total shows what was added');
select lives_ok(
  $$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on)
    values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'LAK', -2000000, '2026-10-13')$$,
  'A can take money back out');
select is((select saved_minor from public.goal_totals where goal_id = 'aaaaaaaa-0000-4000-8000-0000000000a1'), 5000000::bigint, 'the total goes down after taking money out');

-- User A: what the rules refuse
select throws_ok(
  $$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on)
    values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'LAK', -6000000, '2026-10-14')$$,
  '23514'::char(5), null, 'taking out more than is saved is refused');
select is((select saved_minor from public.goal_totals where goal_id = 'aaaaaaaa-0000-4000-8000-0000000000a1'), 5000000::bigint, 'the total is unchanged after the refused take-out');
select throws_ok(
  $$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on)
    values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'LAK', 0, '2026-10-14')$$,
  '23514'::char(5), null, 'a contribution of 0 is refused');
select throws_ok(
  $$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on)
    values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'USD', 100, '2026-10-14')$$,
  '23503'::char(5), null, 'a USD contribution to a LAK goal is refused (composite FK)');
select throws_ok(
  $$insert into public.goals (name, currency, target_minor) values ('Nothing', 'LAK', 0)$$,
  '23514'::char(5), null, 'a target of 0 is refused');
select throws_ok(
  $$insert into public.goals (name, currency, target_minor) values ('laptop', 'LAK', 5)$$,
  '23505'::char(5), null, 'a second active goal with the same name is refused, whatever the capitals');
select lives_ok(
  $$update public.goals set archived_at = now() where id = 'aaaaaaaa-0000-4000-8000-0000000000a1'$$,
  'A can archive their goal');
select lives_ok(
  $$insert into public.goals (name, currency, target_minor) values ('Laptop', 'LAK', 5)$$,
  'the name is free again once the old goal is archived');
select throws_ok(
  $$delete from public.goals where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501'::char(5), null, 'A cannot delete a goal (no delete permission)');
select throws_ok(
  $$update public.goal_contributions set amount_minor = 1 where goal_id = 'aaaaaaaa-0000-4000-8000-0000000000a1'$$,
  '42501'::char(5), null, 'A cannot change a contribution (no update permission)');
select throws_ok(
  $$delete from public.goal_contributions where goal_id = 'aaaaaaaa-0000-4000-8000-0000000000a1'$$,
  '42501'::char(5), null, 'A cannot delete a contribution (no delete permission)');

-- User B: the goals of A are out of reach
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is((select count(*) from public.goals), 0::bigint, 'B cannot see the goals of A');
select is((select count(*) from public.goal_contributions), 0::bigint, 'B cannot see the contributions of A');
select is((select count(*) from public.goal_totals), 0::bigint, 'B cannot see the totals of A');
select throws_ok(
  $$insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on)
    values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'LAK', 1, '2026-10-14')$$,
  '23503'::char(5), null, 'B cannot add money to a goal of A (composite FK)');
select throws_ok(
  $$insert into public.goals (user_id, name, currency, target_minor)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Planted', 'LAK', 5)$$,
  '42501'::char(5), null, 'B cannot add a goal for A');
select lives_ok(
  $$update public.goals set target_minor = 1 where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'B updating the goals of A runs without error (it matches no rows)');

-- Logged-out visitors get nothing at all
set local role anon;
select throws_ok(
  $$select count(*) from public.goals$$,
  '42501'::char(5), null, 'anon cannot read goals');
select throws_ok(
  $$select count(*) from public.goal_totals$$,
  '42501'::char(5), null, 'anon cannot read goal totals');

-- Back as postgres: the update attempt by B changed nothing, and no refused row was kept
reset role;
select is(
  (select target_minor from public.goals where id = 'aaaaaaaa-0000-4000-8000-0000000000a1'),
  10000000::bigint, 'the goal of A still has the target A set');
select is(
  (select count(*) from public.goal_contributions where user_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),
  2::bigint, 'only the two accepted contributions exist for the test users');

select * from finish();
rollback;
