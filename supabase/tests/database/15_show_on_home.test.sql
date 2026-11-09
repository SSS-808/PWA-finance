begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1', 'f@home.test'),
  ('f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2', 'g@home.test');

set local role authenticated;
set local request.jwt.claim.sub = 'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1';

-- An account counts on Home unless told otherwise, and the switch can't be empty
select lives_ok($$select public.create_account('Cash', 'cash', 'LAK', 0, current_date, 0)$$, 'create_account works without the switch');
select is((select show_on_home from public.accounts where name = 'Cash'), true, 'a new account starts switched on');
select throws_ok($$update public.accounts set show_on_home = null where name = 'Cash'$$, '23502'::char(5), null, 'the switch cannot be empty');

-- The switch can be set when creating and changed later
select lives_ok($$select public.create_account('LDB', 'bank', 'LAK', 0, current_date, 0, false)$$, 'create_account takes the switch');
select is((select show_on_home from public.accounts where name = 'LDB'), false, 'switched off is stored');
select lives_ok($$select public.update_account((select id from public.accounts where name = 'LDB'), 'LDB', 'bank', 0, current_date, 0, true)$$, 'update_account takes the switch');
select is((select show_on_home from public.accounts where name = 'LDB'), true, 'switched back on is stored');

-- Leaving the switch out keeps what it was
insert into public.accounts (id, name, type, currency, show_on_home)
  values ('f1000000-0000-4000-8000-000000000001', 'Dong', 'cash', 'VND', false);
select lives_ok($$select public.update_account('f1000000-0000-4000-8000-000000000001', 'Dong', 'cash', 0, current_date, 0)$$, 'update_account works without the switch');
select is((select show_on_home from public.accounts where name = 'Dong'), false, 'leaving the switch out keeps it off');

-- Someone else can't flip it
set local request.jwt.claim.sub = 'f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2';
select throws_ok($$select public.update_account('f1000000-0000-4000-8000-000000000001', 'Dong', 'cash', 0, current_date, 0, true)$$, 'P0002'::char(5), null, 'another person cannot change the switch');

-- The functions stay closed to people who are not logged in
reset role;
select is(has_function_privilege('anon', 'public.update_account(uuid, text, text, bigint, date, bigint, boolean)', 'execute'), false, 'anon cannot run update_account');

select * from finish();
rollback;
