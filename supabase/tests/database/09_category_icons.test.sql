begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@icons.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@icons.test');

-- Sign-up: every default category comes with its icon and colour
select is((select icon || '/' || color from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense' and name = 'Food'), 'utensils/orange', 'Food starts as the orange utensils');
select is((select icon || '/' || color from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'income' and name = 'Salary'), 'briefcase/green', 'Salary starts as the green briefcase');
select is((select count(*) from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and icon = 'tag'), 0::bigint, 'no default category is left on the neutral tag');
select is((select count(*) from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and icon = 'ellipsis' and color = 'gray'), 2::bigint, 'both Other categories are the grey dots');
select is((select count(distinct icon) from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 15::bigint, 'the 16 default categories use 15 different icons');

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- A category added without an icon or colour gets the grey tag
insert into public.categories (name, kind) values ('Coffee beans', 'expense');
select is((select icon || '/' || color from public.categories where name = 'Coffee beans'), 'tag/gray', 'a new category defaults to the grey tag');

-- The owner can change both, but only to keys from the fixed set
update public.categories set icon = 'coffee', color = 'amber' where name = 'Coffee beans';
select is((select icon || '/' || color from public.categories where name = 'Coffee beans'), 'coffee/amber', 'the owner can change the icon and the colour');
select throws_ok($$update public.categories set icon = 'rocket' where name = 'Coffee beans'$$, '23514'::char(5), null, 'an unknown icon is refused');
select throws_ok($$update public.categories set color = 'neon' where name = 'Coffee beans'$$, '23514'::char(5), null, 'an unknown colour is refused');
select throws_ok($$insert into public.categories (name, kind, icon) values ('No icon', 'expense', '')$$, '23514'::char(5), null, 'an empty icon is refused');
select throws_ok($$update public.categories set color = null where name = 'Coffee beans'$$, '23502'::char(5), null, 'a missing colour is refused');

-- Another user can neither see nor change it
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select is((select count(*) from public.categories where name = 'Coffee beans'), 0::bigint, 'another user cannot see the category');
update public.categories set icon = 'car' where name = 'Coffee beans';

reset role;
select is((select icon from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and name = 'Coffee beans'), 'coffee', 'another user cannot change the icon');

select * from finish();
rollback;
