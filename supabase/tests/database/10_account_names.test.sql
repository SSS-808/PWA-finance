begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@names.test'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'd@names.test');

set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

-- One name may be used once per currency, whatever the capitals
select lives_ok($$insert into public.accounts (name, type, currency) values ('BCEL', 'bank', 'LAK')$$, 'a first BCEL in kip is accepted');
select lives_ok($$insert into public.accounts (name, type, currency) values ('BCEL', 'bank', 'USD')$$, 'BCEL in dollars is accepted next to BCEL in kip');
select lives_ok($$insert into public.accounts (name, type, currency) values ('bcel', 'bank', 'THB')$$, 'BCEL in baht is accepted in other capitals');
select throws_ok($$insert into public.accounts (name, type, currency) values ('Bcel', 'bank', 'LAK')$$, '23505'::char(5), null, 'a second BCEL in kip is refused, whatever the capitals');

-- An archived account frees its name in its own currency
update public.accounts set archived_at = now() where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' and currency = 'USD';
select lives_ok($$insert into public.accounts (name, type, currency) values ('BCEL', 'bank', 'USD')$$, 'a new BCEL in dollars is accepted once the old one is archived');
select is((select count(*) from public.accounts where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' and lower(name) = 'bcel'), 4::bigint, 'the user has four BCEL accounts, one of them archived');

-- Another user's names never clash
set local request.jwt.claim.sub = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
select lives_ok($$insert into public.accounts (name, type, currency) values ('BCEL', 'bank', 'LAK')$$, 'another user can have BCEL in kip too');

select * from finish();
rollback;
