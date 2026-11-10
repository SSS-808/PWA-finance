begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, email) values
  ('a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7', 'a@trips.test'),
  ('b7b7b7b7-b7b7-4b7b-8b7b-b7b7b7b7b7b7', 'b@trips.test');

-- The table is locked down before anyone logs in
select is((select relrowsecurity from pg_class where oid = 'public.trips'::regclass), true, 'trips has row level security on');
select is(has_table_privilege('anon', 'public.trips', 'select'), false, 'anon cannot read trips');
select is(has_function_privilege('anon', 'public.label_trip_entries(uuid)', 'execute'), false, 'anon cannot run label_trip_entries');

set local role authenticated;
set local request.jwt.claim.sub = 'a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7';

-- A trip needs a name and days in order, and two trips can't share a day
select lives_ok($$insert into public.trips (id, name, starts_on, ends_on) values ('a1000000-0000-4000-8000-0000000000a1', 'Vietnam', '2026-12-10', '2026-12-17')$$, 'A adds a trip');
select is((select user_id from public.trips where name = 'Vietnam'), 'a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7'::uuid, 'the trip belongs to A');
select throws_ok($$insert into public.trips (name, starts_on, ends_on) values ('Backwards', '2026-11-05', '2026-11-01')$$, '23514'::char(5), null, 'a last day before the first day is refused');
select throws_ok($$insert into public.trips (name, starts_on, ends_on) values ('   ', '2026-11-01', '2026-11-02')$$, '23514'::char(5), null, 'a blank name is refused');
select throws_ok($$insert into public.trips (name, starts_on, ends_on) values ('Overlap', '2026-12-17', '2026-12-20')$$, '23P01'::char(5), null, 'a trip sharing a day with another is refused');
select lives_ok($$insert into public.trips (id, name, starts_on, ends_on) values ('a1000000-0000-4000-8000-0000000000a2', 'Hanoi extra', '2026-12-18', '2026-12-20')$$, 'a trip starting the day after another ends is fine');
select lives_ok($$update public.trips set ends_on = '2026-12-16' where name = 'Vietnam'$$, 'A changes a trip''s dates');

-- Only money in and out can carry a trip
insert into public.accounts (id, name, type, currency) values ('a2000000-0000-4000-8000-0000000000a1', 'Cash', 'cash', 'LAK');
select lives_ok($$insert into public.transactions (account_id, category_id, kind, amount_minor, currency, transaction_date, description, trip_id)
  values ('a2000000-0000-4000-8000-0000000000a1', (select id from public.categories where name = 'Food' and kind = 'expense'), 'expense', -100, 'LAK', '2026-12-11', 'tagged', 'a1000000-0000-4000-8000-0000000000a1')$$, 'an expense can carry a trip');
select throws_ok($$insert into public.transactions (account_id, kind, amount_minor, currency, transaction_date, trip_id)
  values ('a2000000-0000-4000-8000-0000000000a1', 'opening_balance', 500, 'LAK', '2026-12-11', 'a1000000-0000-4000-8000-0000000000a1')$$, '23514'::char(5), null, 'a starting amount cannot carry a trip');

-- label_trip_entries labels only untagged, not deleted money in and out inside the trip's days
insert into public.transactions (account_id, category_id, kind, amount_minor, currency, transaction_date, description, deleted_at, trip_id)
select 'a2000000-0000-4000-8000-0000000000a1', c.id, v.kind, v.amount, 'LAK', v.day::date, v.note, v.deleted::timestamptz, v.trip::uuid
from (values
  ('expense', -200, '2026-12-12', 'inside', null, null),
  ('income', 300, '2026-12-13', 'inside income', null, null),
  ('expense', -400, '2026-12-25', 'outside', null, null),
  ('expense', -500, '2026-12-14', 'deleted', '2026-12-14 10:00+00', null),
  ('expense', -600, '2026-12-15', 'other trip', null, 'a1000000-0000-4000-8000-0000000000a2')
) as v(kind, amount, day, note, deleted, trip)
join public.categories c on c.name = case when v.kind = 'income' then 'Salary' else 'Food' end and c.kind = v.kind;
select is(public.label_trip_entries('a1000000-0000-4000-8000-0000000000a1'), 2, 'label_trip_entries labels the 2 untagged entries inside the days');
select is((select count(*) from public.transactions where trip_id = 'a1000000-0000-4000-8000-0000000000a1'), 3::bigint, 'the trip now holds 3 entries');
select is((select trip_id from public.transactions where description = 'other trip'), 'a1000000-0000-4000-8000-0000000000a2'::uuid, 'an entry of another trip keeps its trip');
select is((select trip_id from public.transactions where description = 'outside'), null, 'an entry outside the days stays without a trip');
select is((select trip_id from public.transactions where description = 'deleted'), null, 'a deleted entry stays without a trip');

-- B sees nothing of A and can't use or change A's trips
set local request.jwt.claim.sub = 'b7b7b7b7-b7b7-4b7b-8b7b-b7b7b7b7b7b7';
select is((select count(*) from public.trips), 0::bigint, 'B sees none of A''s trips');
select throws_ok($$select public.label_trip_entries('a1000000-0000-4000-8000-0000000000a1')$$, 'P0002'::char(5), null, 'B cannot label entries with A''s trip');
insert into public.accounts (id, name, type, currency) values ('b2000000-0000-4000-8000-0000000000b1', 'Cash', 'cash', 'LAK');
select throws_ok($$insert into public.transactions (account_id, category_id, kind, amount_minor, currency, transaction_date, trip_id)
  values ('b2000000-0000-4000-8000-0000000000b1', (select id from public.categories where name = 'Food' and kind = 'expense'), 'expense', -100, 'LAK', '2026-12-11', 'a1000000-0000-4000-8000-0000000000a1')$$, '23503'::char(5), null, 'B cannot put A''s trip on B''s own entry');
select lives_ok($$update public.trips set name = 'Hacked' where id = 'a1000000-0000-4000-8000-0000000000a1'$$, 'B''s update of A''s trip runs');
select lives_ok($$delete from public.trips where id = 'a1000000-0000-4000-8000-0000000000a1'$$, 'B''s delete of A''s trip runs');
select lives_ok($$insert into public.trips (name, starts_on, ends_on) values ('B in Vietnam', '2026-12-10', '2026-12-17')$$, 'B can have a trip on the same days as A');

-- Back as A: nothing B did reached A's trip; deleting it keeps the entries
set local request.jwt.claim.sub = 'a7a7a7a7-a7a7-4a7a-8a7a-a7a7a7a7a7a7';
select is((select name from public.trips where id = 'a1000000-0000-4000-8000-0000000000a1'), 'Vietnam', 'B''s update and delete did not touch A''s trip');
delete from public.trips where id = 'a1000000-0000-4000-8000-0000000000a1';
select is((select count(*) from public.transactions where description in ('tagged', 'inside', 'inside income') and trip_id is null and deleted_at is null), 3::bigint, 'deleting a trip keeps its entries and clears their label');

select * from finish();
rollback;
