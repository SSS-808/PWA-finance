-- Each category has an icon and a colour, stored as keys from a fixed set; the app turns the keys into pictures and colours
alter table public.categories
  add column icon text not null default 'tag'
    constraint categories_icon_check check (icon in (
      'tag', 'utensils', 'car', 'graduation-cap', 'tv', 'shopping-bag', 'zap', 'heart-pulse',
      'plane', 'ellipsis', 'briefcase', 'laptop', 'store', 'trending-up', 'gift', 'house',
      'shirt', 'coffee', 'fuel', 'smartphone', 'baby', 'paw-print', 'dumbbell', 'wrench')),
  add column color text not null default 'gray'
    constraint categories_color_check check (color in (
      'gray', 'orange', 'blue', 'violet', 'pink', 'teal', 'amber', 'rose', 'indigo', 'green'));

-- New users: the default categories now come with their icon and colour
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.categories (user_id, name, kind, icon, color)
  select new.id, c.name, c.kind, c.icon, c.color
  from (values
    ('Food', 'expense', 'utensils', 'orange'), ('Transportation', 'expense', 'car', 'blue'),
    ('Education', 'expense', 'graduation-cap', 'violet'), ('Entertainment', 'expense', 'tv', 'pink'),
    ('Shopping', 'expense', 'shopping-bag', 'teal'), ('Bills', 'expense', 'zap', 'amber'),
    ('Healthcare', 'expense', 'heart-pulse', 'rose'), ('Travel', 'expense', 'plane', 'indigo'),
    ('Other', 'expense', 'ellipsis', 'gray'),
    ('Salary', 'income', 'briefcase', 'green'), ('Freelance', 'income', 'laptop', 'teal'),
    ('Business', 'income', 'store', 'indigo'), ('Investment', 'income', 'trending-up', 'amber'),
    ('Gift', 'income', 'gift', 'pink'), ('Other', 'income', 'ellipsis', 'gray')
  ) as c (name, kind, icon, color);
  return new;
end $$;

-- Categories that already exist and still have a default name get that default's icon and colour; the rest keep the grey tag
update public.categories as c
set icon = d.icon, color = d.color
from (values
  ('Food', 'expense', 'utensils', 'orange'), ('Transportation', 'expense', 'car', 'blue'),
  ('Education', 'expense', 'graduation-cap', 'violet'), ('Entertainment', 'expense', 'tv', 'pink'),
  ('Shopping', 'expense', 'shopping-bag', 'teal'), ('Bills', 'expense', 'zap', 'amber'),
  ('Healthcare', 'expense', 'heart-pulse', 'rose'), ('Travel', 'expense', 'plane', 'indigo'),
  ('Other', 'expense', 'ellipsis', 'gray'),
  ('Salary', 'income', 'briefcase', 'green'), ('Freelance', 'income', 'laptop', 'teal'),
  ('Business', 'income', 'store', 'indigo'), ('Investment', 'income', 'trending-up', 'amber'),
  ('Gift', 'income', 'gift', 'pink'), ('Other', 'income', 'ellipsis', 'gray')
) as d (name, kind, icon, color)
where c.name = d.name and c.kind = d.kind;
