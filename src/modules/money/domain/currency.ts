// Kip, dollar and baht first, then the travel currencies by name
export const CURRENCY_CODES = [
  "LAK",
  "USD",
  "THB",
  "BND",
  "KHR",
  "CNY",
  "EUR",
  "HKD",
  "IDR",
  "JPY",
  "MYR",
  "MMK",
  "PHP",
  "SGD",
  "KRW",
  "VND",
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

// Mirrors the minor_unit column of the currencies table (docs/database.md §4)
const MINOR_UNITS: Record<CurrencyCode, number> = {
  LAK: 2,
  USD: 2,
  THB: 2,
  BND: 2,
  KHR: 2,
  CNY: 2,
  EUR: 2,
  HKD: 2,
  IDR: 2,
  JPY: 2,
  MYR: 2,
  MMK: 2,
  PHP: 2,
  SGD: 2,
  KRW: 2,
  VND: 2,
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(value);
}

export function minorUnitOf(currency: CurrencyCode): number {
  return MINOR_UNITS[currency];
}
