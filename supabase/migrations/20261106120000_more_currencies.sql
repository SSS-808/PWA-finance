-- Travel currencies (ASEAN, Hong Kong, China, Japan, Korea, euro); all use 2 decimals like the owner's bank
insert into public.currencies (code, name, minor_unit) values
  ('BND', 'Brunei dollar', 2),
  ('KHR', 'Cambodian riel', 2),
  ('CNY', 'Chinese yuan', 2),
  ('EUR', 'Euro', 2),
  ('HKD', 'Hong Kong dollar', 2),
  ('IDR', 'Indonesian rupiah', 2),
  ('JPY', 'Japanese yen', 2),
  ('MYR', 'Malaysian ringgit', 2),
  ('MMK', 'Myanmar kyat', 2),
  ('PHP', 'Philippine peso', 2),
  ('SGD', 'Singapore dollar', 2),
  ('KRW', 'South Korean won', 2),
  ('VND', 'Vietnamese dong', 2);
