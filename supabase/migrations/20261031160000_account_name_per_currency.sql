-- One name may be used once per currency, so a bank can hold kip, dollars and baht as accounts the app shows together
drop index public.accounts_active_name_uq;
create unique index accounts_active_name_uq on public.accounts (user_id, lower(name), currency) where archived_at is null;
