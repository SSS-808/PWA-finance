begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

insert into auth.users (id, email) values
  ('a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8', 'a@people.test'),
  ('b8b8b8b8-b8b8-4b8b-8b8b-b8b8b8b8b8b8', 'b@people.test');

-- The table and the functions are locked down before anyone logs in
select is((select relrowsecurity from pg_class where oid = 'public.people'::regclass), true, 'people has row level security on');
select is(has_table_privilege('anon', 'public.people', 'select'), false, 'anon cannot read people');
select is(has_table_privilege('authenticated', 'public.people', 'delete'), false, 'nobody can delete a person');
select is(has_function_privilege('anon', 'public.person_jar(uuid, char)', 'execute'), false, 'anon cannot run person_jar');
select is(has_function_privilege('anon', 'public.move_money_with_person(uuid, uuid, boolean, char, bigint, bigint, date, text)', 'execute'), false, 'anon cannot run move_money_with_person');
select is(has_function_privilege('anon', 'public.start_person_balance(uuid, char, bigint, date, text)', 'execute'), false, 'anon cannot run start_person_balance');
select is(has_function_privilege('anon', 'public.forgive_person_balance(uuid, date)', 'execute'), false, 'anon cannot run forgive_person_balance');

set local role authenticated;
set local request.jwt.claim.sub = 'a8a8a8a8-a8a8-4a8a-8a8a-a8a8a8a8a8a8';

-- A person needs a name, once per user while active
select lives_ok($$insert into public.people (id, name) values ('a1000000-0000-4000-8000-0000000000a1', 'Nok')$$, 'A adds Nok');
select lives_ok($$insert into public.people (id, name) values ('a1000000-0000-4000-8000-0000000000a2', 'Ana')$$, 'A adds Ana');
select throws_ok($$insert into public.people (name) values ('   ')$$, '23514'::char(5), null, 'a blank name is refused');
select throws_ok($$insert into public.people (name) values (' nok ')$$, '23505'::char(5), null, 'the same name twice is refused');

insert into public.accounts (id, name, type, currency) values
  ('a2000000-0000-4000-8000-0000000000a1', 'Cash', 'cash', 'LAK'),
  ('a2000000-0000-4000-8000-0000000000a2', 'Cash baht', 'cash', 'THB');

-- Only a jar has a person, and only a jar can have a pay-back date
select throws_ok($$insert into public.accounts (name, type, currency) values ('Fake jar', 'person', 'LAK')$$, '23514'::char(5), null, 'a jar without a person is refused');
select throws_ok($$insert into public.accounts (name, type, currency, person_id) values ('Bank', 'bank', 'LAK', 'a1000000-0000-4000-8000-0000000000a1')$$, '23514'::char(5), null, 'a real account with a person is refused');
select throws_ok($$update public.accounts set due_on = '2026-12-01' where id = 'a2000000-0000-4000-8000-0000000000a1'$$, '23514'::char(5), null, 'a real account cannot have a pay-back date');

-- Lending makes the jar once and moves the money as a transfer
select lives_ok($$select public.move_money_with_person('a1000000-0000-4000-8000-0000000000a1', 'a2000000-0000-4000-8000-0000000000a1', true, 'LAK', 100000, 100000, '2026-11-02', 'motorbike repair')$$, 'A lends Nok ₭100,000 from Cash');
select lives_ok($$select public.move_money_with_person('a1000000-0000-4000-8000-0000000000a1', 'a2000000-0000-4000-8000-0000000000a1', false, 'LAK', 40000, 40000, '2026-11-15')$$, 'Nok pays back ₭40,000 into Cash');
select is((select count(*) from public.accounts where person_id = 'a1000000-0000-4000-8000-0000000000a1' and currency = 'LAK'), 1::bigint, 'Nok has one kip jar');
select is((select row(name, type, show_on_home, minimum_minor)::text from public.accounts where person_id = 'a1000000-0000-4000-8000-0000000000a1' and currency = 'LAK'), '(Nok,person,f,0)', 'the jar is named Nok, hidden from Home and has no minimum');
select is((select balance_minor from public.account_balances where account_id = public.person_jar('a1000000-0000-4000-8000-0000000000a1', 'LAK')), 60000::bigint, 'Nok owes ₭60,000');
select is((select balance_minor from public.account_balances where account_id = 'a2000000-0000-4000-8000-0000000000a1'), -60000::bigint, 'Cash went down by ₭60,000');
select is((select count(*) from public.transactions where kind in ('income', 'expense')), 0::bigint, 'lending and paying back are never income or spending');

-- Lent baht, paid back in kip: the baht jar empties and Cash gets the kip
select lives_ok($$select public.move_money_with_person('a1000000-0000-4000-8000-0000000000a1', 'a2000000-0000-4000-8000-0000000000a2', true, 'THB', 50000, 50000, '2026-11-20')$$, 'A lends Nok ฿500 from Cash baht');
select lives_ok($$select public.move_money_with_person('a1000000-0000-4000-8000-0000000000a1', 'a2000000-0000-4000-8000-0000000000a1', false, 'THB', 50000, 300000, '2026-11-24')$$, 'Nok pays back ฿500 with ₭300,000');
select is((select balance_minor from public.account_balances where account_id = public.person_jar('a1000000-0000-4000-8000-0000000000a1', 'THB')), 0::bigint, 'Nok owes ฿0');
select is((select balance_minor from public.account_balances where account_id = 'a2000000-0000-4000-8000-0000000000a1'), 240000::bigint, 'Cash got the ₭300,000');
select throws_ok($$select public.move_money_with_person('a1000000-0000-4000-8000-0000000000a1', public.person_jar('a1000000-0000-4000-8000-0000000000a1', 'LAK'), true, 'LAK', 100, 100, '2026-11-24')$$, '22023'::char(5), null, 'a jar cannot be used as the account');

-- A jar stays hidden, keeps its type and follows its person's name
select throws_ok($$update public.accounts set show_on_home = true where person_id is not null$$, '23514'::char(5), null, 'a jar cannot count on Home');
select throws_ok($$update public.accounts set type = 'bank' where person_id is not null$$, '23514'::char(5), null, 'a jar cannot turn into a real account');
select lives_ok($$update public.accounts set due_on = '2026-11-30' where person_id = 'a1000000-0000-4000-8000-0000000000a1' and currency = 'LAK'$$, 'a jar can have a pay-back date');
select lives_ok($$insert into public.accounts (name, type, currency) values ('Nok', 'bank', 'LAK')$$, 'a real account may share a jar''s name');
update public.people set name = 'Nok S.' where id = 'a1000000-0000-4000-8000-0000000000a1';
select is((select count(*) from public.accounts where person_id = 'a1000000-0000-4000-8000-0000000000a1' and name = 'Nok S.'), 2::bigint, 'renaming Nok renames both jars');

-- An old debt from before the app, then forgiving what's left
select lives_ok($$select public.start_person_balance('a1000000-0000-4000-8000-0000000000a2', 'THB', -30000, '2026-11-18', 'from before the app')$$, 'A notes owing Ana ฿300 from before the app');
select is((select balance_minor from public.account_balances where account_id = public.person_jar('a1000000-0000-4000-8000-0000000000a2', 'THB')), -30000::bigint, 'A owes Ana ฿300');
select is(public.forgive_person_balance(public.person_jar('a1000000-0000-4000-8000-0000000000a1', 'LAK'), '2026-11-24'), 60000::bigint, 'forgiving Nok forgives ₭60,000');
select is((select amount_minor from public.transactions t join public.categories c on c.id = t.category_id where c.name = 'Loans written off'), -60000::bigint, 'it is spending under Loans written off');
select is(public.forgive_person_balance(public.person_jar('a1000000-0000-4000-8000-0000000000a2', 'THB'), '2026-11-24'), 30000::bigint, 'Ana forgiving A forgives ฿300');
select is((select row(t.kind, t.amount_minor)::text from public.transactions t join public.categories c on c.id = t.category_id where c.name = 'Debts forgiven'), '(income,30000)', 'it is income under Debts forgiven');
select throws_ok($$select public.forgive_person_balance(public.person_jar('a1000000-0000-4000-8000-0000000000a1', 'LAK'), '2026-11-24')$$, '22023'::char(5), null, 'an empty jar has nothing to forgive');
select throws_ok($$select public.forgive_person_balance('a2000000-0000-4000-8000-0000000000a1', '2026-11-24')$$, 'P0002'::char(5), null, 'a real account cannot be forgiven');

-- B sees nothing of A and can't use A's people
set local request.jwt.claim.sub = 'b8b8b8b8-b8b8-4b8b-8b8b-b8b8b8b8b8b8';
select is((select count(*) from public.people), 0::bigint, 'B sees none of A''s people');
select throws_ok($$select public.person_jar('a1000000-0000-4000-8000-0000000000a1', 'USD')$$, 'P0002'::char(5), null, 'B cannot open a jar for A''s person');
select throws_ok($$insert into public.accounts (name, type, currency, person_id, show_on_home) values ('Stolen', 'person', 'LAK', 'a1000000-0000-4000-8000-0000000000a1', false)$$, '23503'::char(5), null, 'B cannot give A''s person a jar');

select * from finish();
rollback;
