export const CURRENCY_CODES = ["LAK", "USD", "THB"] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

// Mirrors the minor_unit column of the currencies table (docs/database.md §4)
const MINOR_UNITS: Record<CurrencyCode, number> = { LAK: 0, USD: 2, THB: 2 };

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (CURRENCY_CODES as readonly string[]).includes(value);
}

export function minorUnitOf(currency: CurrencyCode): number {
  return MINOR_UNITS[currency];
}
