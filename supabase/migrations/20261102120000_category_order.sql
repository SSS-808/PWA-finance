-- Each category has a place in its own list (expense or income); lower numbers come first
alter table public.categories
  add column position integer not null default 0
    constraint categories_position_check check (position >= 0);

-- Existing categories start in the order the Add form showed: most-used first, then by name; hidden ones last
update public.categories as c
set position = o.place
from (
  select cat.id,
         (row_number() over (
            partition by cat.user_id, cat.kind
            order by cat.archived_at is not null, count(t.id) desc, lower(cat.name), cat.id
          ) - 1)::integer as place
    from public.categories cat
    left join public.transactions t on t.category_id = cat.id and t.deleted_at is null
   group by cat.id
) as o
where o.id = c.id;

-- A new category always goes to the end of its list, whatever position it was given
create function private.category_goes_last() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.position := coalesce(
    (select max(c.position) + 1 from public.categories c
      where c.user_id = new.user_id and c.kind = new.kind),
    0);
  return new;
end $$;

create trigger categories_go_last
  before insert on public.categories
  for each row execute function private.category_goes_last();

-- Saves a new order for one list: the given ids come first in that order, the rest keep their order after them
create function public.reorder_categories(p_kind text, p_ids uuid[]) returns void
language plpgsql set search_path = '' as $$
begin
  if p_kind is null or p_kind not in ('income', 'expense') then
    raise exception 'Unknown category kind' using errcode = '22023';
  end if;
  if p_ids is null or cardinality(p_ids) > 200
     or (select count(distinct id) from unnest(p_ids) as g (id)) <> cardinality(p_ids) then
    raise exception 'The list must hold up to 200 different categories' using errcode = '22023';
  end if;

  update public.categories as c
     set position = o.place
    from (
      select cat.id,
             (row_number() over (
                order by g.ord nulls last, cat.position, lower(cat.name), cat.id
              ) - 1)::integer as place
        from public.categories cat
        left join unnest(p_ids) with ordinality as g (id, ord) on g.id = cat.id
       where cat.kind = p_kind and cat.user_id = (select auth.uid())
    ) as o
   where o.id = c.id and c.position <> o.place;
end $$;

revoke execute on function public.reorder_categories(text, uuid[]) from public, anon;
grant execute on function public.reorder_categories(text, uuid[]) to authenticated;
