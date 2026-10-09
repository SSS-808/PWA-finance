-- Local development data only; never runs on production

-- Demo user: the sign-up trigger creates the profile and the 15 categories
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'demo@wallet.test',
  extensions.crypt('local-demo-password', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '', '', '', ''
);

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '{"sub": "11111111-1111-4111-8111-111111111111", "email": "demo@wallet.test", "email_verified": true}',
  'email',
  now(),
  now(),
  now()
);

insert into public.accounts (id, user_id, name, type, currency) values
  ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-111111111111', 'Cash', 'cash', 'LAK'),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-111111111111', 'BCEL', 'bank', 'LAK'),
  ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-111111111111', 'USD Cash', 'cash', 'USD'),
  ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-111111111111', 'Visa', 'credit_card', 'USD');

-- Opening balances, dated the day before the current month starts
insert into public.transactions (user_id, account_id, kind, amount_minor, currency, transaction_date) values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000001', 'opening_balance', 1500000, 'LAK', date_trunc('month', current_date)::date - 1),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000002', 'opening_balance', 12000000, 'LAK', date_trunc('month', current_date)::date - 1),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000003', 'opening_balance', 20000, 'USD', date_trunc('month', current_date)::date - 1);

-- Income and expenses; categories are looked up by (user_id, kind, name)
insert into public.transactions (user_id, account_id, category_id, kind, amount_minor, currency, description, transaction_date, deleted_at) values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000002',
   (select id from public.categories where user_id = '11111111-1111-4111-8111-111111111111' and kind = 'income' and name = 'Salary'),
   'income', 8000000, 'LAK', 'Salary', date_trunc('month', current_date)::date, null),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000002',
   (select id from public.categories where user_id = '11111111-1111-4111-8111-111111111111' and kind = 'expense' and name = 'Bills'),
   'expense', -350000, 'LAK', 'Electricity', date_trunc('month', current_date)::date, null),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000001',
   (select id from public.categories where user_id = '11111111-1111-4111-8111-111111111111' and kind = 'expense' and name = 'Food'),
   'expense', -45000, 'LAK', 'Lunch', current_date, null),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000004',
   (select id from public.categories where user_id = '11111111-1111-4111-8111-111111111111' and kind = 'expense' and name = 'Food'),
   'expense', -3000, 'USD', 'Dinner', current_date, null),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000001',
   (select id from public.categories where user_id = '11111111-1111-4111-8111-111111111111' and kind = 'expense' and name = 'Shopping'),
   'expense', -200000, 'LAK', 'Deleted example', current_date, now());

-- Transfers: both legs in one statement, same transfer_id
insert into public.transactions (user_id, account_id, kind, amount_minor, currency, description, transaction_date, transfer_id) values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000002', 'transfer', -500000, 'LAK', 'ATM withdrawal', date_trunc('month', current_date)::date, '33333333-3333-4333-8333-000000000001'),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000001', 'transfer', 500000, 'LAK', 'ATM withdrawal', date_trunc('month', current_date)::date, '33333333-3333-4333-8333-000000000001');

insert into public.transactions (user_id, account_id, kind, amount_minor, currency, description, transaction_date, transfer_id) values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000003', 'transfer', -10000, 'USD', 'Money changer', current_date, '33333333-3333-4333-8333-000000000002'),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000001', 'transfer', 2150000, 'LAK', 'Money changer', current_date, '33333333-3333-4333-8333-000000000002');

-- Adjustment: the app balance did not match the bank app
insert into public.transactions (user_id, account_id, kind, amount_minor, currency, description, transaction_date) values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-000000000002', 'adjustment', -50000, 'LAK', 'Match BCEL app', current_date);
