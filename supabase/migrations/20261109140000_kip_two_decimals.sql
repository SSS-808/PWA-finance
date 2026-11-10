-- Kip gets 2 decimals: every saved kip amount becomes x100 in one all-or-nothing step (docs/adr/014-kip-has-decimals.md)
do $$
declare
  c_limit constant numeric := 100000000000;
  v_place record;
  v_largest numeric;
  v_before numeric;
  v_after numeric;
  v_rows bigint;
begin
  if (select minor_unit from public.currencies where code = 'LAK') <> 0 then
    raise exception 'Kip already has decimals';
  end if;

  if exists (select 1 from public.account_balances where currency = 'LAK' and abs(balance_minor) > c_limit) then
    raise exception 'A kip balance would go over the amount limit';
  end if;

  for v_place in
    select * from (values
      ('transactions', 'amount_minor'),
      ('budgets', 'amount_minor'),
      ('goals', 'target_minor'),
      ('goal_contributions', 'amount_minor'),
      ('accounts', 'minimum_minor')
    ) as places (table_name, column_name)
  loop
    execute format(
      'select coalesce(max(abs(%1$I)), 0), coalesce(sum(%1$I), 0) from public.%2$I where currency = ''LAK''',
      v_place.column_name, v_place.table_name
    ) into v_largest, v_before;

    if v_largest > c_limit then
      raise exception 'A kip amount in % would go over the amount limit', v_place.table_name;
    end if;

    execute format(
      'update public.%2$I set %1$I = %1$I * 100 where currency = ''LAK''',
      v_place.column_name, v_place.table_name
    );
    get diagnostics v_rows = row_count;

    execute format(
      'select coalesce(sum(%1$I), 0) from public.%2$I where currency = ''LAK''',
      v_place.column_name, v_place.table_name
    ) into v_after;

    if v_after <> v_before * 100 then
      raise exception 'Kip total in % is % but should be %', v_place.table_name, v_after, v_before * 100;
    end if;

    raise notice 'Kip decimals: % rows changed in %', v_rows, v_place.table_name;
  end loop;

  update public.currencies set minor_unit = 2 where code = 'LAK';
end $$;
