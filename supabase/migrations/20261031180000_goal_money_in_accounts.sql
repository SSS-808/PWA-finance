-- A contribution can name the account its money is set aside in; that account's free to spend goes down by it (docs/adr/012)
alter table public.goal_contributions
  add column account_id uuid,
  -- the account must belong to the same user and use the goal's currency
  add constraint goal_contributions_account_fk
    foreign key (account_id, user_id, currency) references public.accounts (id, user_id, currency);
create index goal_contributions_account_idx on public.goal_contributions (account_id);

-- What a goal holds in each account (and outside any account) can never go below 0, so the total can't either
create or replace function private.check_goal_saved() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_saved numeric;
begin
  -- Lock the goal so two contributions cannot both pass the check at the same moment
  perform 1 from public.goals where id = new.goal_id for no key update;
  select coalesce(sum(amount_minor), 0) into v_saved
    from public.goal_contributions
   where goal_id = new.goal_id
     and account_id is not distinct from new.account_id;
  if v_saved < 0 then
    raise exception 'Goal % cannot go below zero in this account', new.goal_id using errcode = '23514';
  end if;
  return null;
end $$;

-- What is set aside in each account for goals that are not archived; an archived goal frees its money
create view public.account_set_aside with (security_invoker = true) as
select c.account_id,
       c.user_id,
       sum(c.amount_minor)::bigint as set_aside_minor
from public.goal_contributions c
join public.goals g on g.id = c.goal_id and g.archived_at is null
where c.account_id is not null
group by c.account_id, c.user_id;

revoke all on public.account_set_aside from anon, authenticated;
grant select on public.account_set_aside to authenticated;

-- Takes goal money out of an account that no longer holds it (balance − minimum below what is set aside); the goal with the most there gives first, or only p_goal_id when given
create function public.release_goal_shortfall(p_account_id uuid, p_goal_id uuid, p_on date) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
  v_currency char(3);
  v_held bigint;
  v_aside bigint;
  v_short bigint;
  v_take bigint;
  v_total bigint := 0;
  r record;
begin
  -- Lock the account so two releases cannot both take the same shortfall
  select a.currency, a.minimum_minor into v_currency, v_held
    from public.accounts a
   where a.id = p_account_id
     for no key update;
  if v_currency is null then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;
  v_held := coalesce((select balance_minor from public.account_balances where account_id = p_account_id), 0) - v_held;
  v_aside := coalesce((select set_aside_minor from public.account_set_aside where account_id = p_account_id), 0);
  v_short := v_aside - greatest(v_held, 0);

  for r in
    select c.goal_id, sum(c.amount_minor)::bigint as held
      from public.goal_contributions c
      join public.goals g on g.id = c.goal_id and g.archived_at is null
     where c.account_id = p_account_id
       and (p_goal_id is null or c.goal_id = p_goal_id)
     group by c.goal_id
    having sum(c.amount_minor) > 0
     order by sum(c.amount_minor) desc, c.goal_id
  loop
    exit when v_short <= 0;
    v_take := least(r.held, v_short);
    insert into public.goal_contributions (goal_id, currency, amount_minor, contributed_on, account_id)
    values (r.goal_id, v_currency, -v_take, p_on, p_account_id);
    v_short := v_short - v_take;
    v_total := v_total + v_take;
  end loop;
  return v_total;
end $$;

revoke execute on function public.release_goal_shortfall(uuid, uuid, date) from public, anon;
grant execute on function public.release_goal_shortfall(uuid, uuid, date) to authenticated;
