begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@order.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@order.test');

select col_not_null('public', 'categories', 'position', 'every category has a position');

-- Sign-up: the default categories are numbered 0, 1, 2… in each list
select is((select array_agg(position order by position) from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'expense'), array[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 'the default expense categories are numbered 0 to 9');
select is((select array_agg(position order by position) from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and kind = 'income'), array[0, 1, 2, 3, 4, 5], 'the default income categories are numbered 0 to 5');

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- A new category goes to the end of its list, even when it asks for another place
insert into public.categories (id, name, kind, position) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Coffee beans', 'expense', 0);
select is((select position from public.categories where name = 'Coffee beans'), 10, 'a new category goes last');

-- Reordering puts the given ids first, in that order, and the rest after them in their old order
select public.reorder_categories('expense', array[
  (select id from public.categories where kind = 'expense' and name = 'Coffee beans'),
  (select id from public.categories where kind = 'expense' and name = 'Bills')]);
select is((select position from public.categories where kind = 'expense' and name = 'Coffee beans'), 0, 'the first id gets place 0');
select is((select position from public.categories where kind = 'expense' and name = 'Bills'), 1, 'the second id gets place 1');
select is((select array_agg(position order by position) from public.categories where kind = 'expense'), array[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'the places stay 0 to 10 with no gaps or repeats');
select is((select array_agg(position order by position) from public.categories where kind = 'income'), array[0, 1, 2, 3, 4, 5], 'reordering expenses leaves income alone');

-- Bad input is refused
select throws_ok($$select public.reorder_categories('transfer', '{}')$$, '22023'::char(5), null, 'an unknown kind is refused');
select throws_ok($$select public.reorder_categories('expense', null)$$, '22023'::char(5), null, 'a missing list is refused');
select throws_ok($$select public.reorder_categories('expense', array['cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[])$$, '22023'::char(5), null, 'the same id twice is refused');
select throws_ok($$update public.categories set position = -1 where name = 'Coffee beans'$$, '23514'::char(5), null, 'a negative position is refused');

-- Another user cannot move someone else's categories
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select public.reorder_categories('expense', array[
  (select id from public.categories where kind = 'expense' and name = 'Food'), 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid]);

reset role;
select is((select position from public.categories where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and name = 'Coffee beans'), 0, 'another user cannot move this category');

-- Visitors who are not logged in cannot run it
set local role anon;
select throws_ok($$select public.reorder_categories('expense', '{}')$$, '42501'::char(5), null, 'anon cannot reorder');

select * from finish();
rollback;
