import { CURRENCY_CODES, type CurrencyCode } from "./currency";

export type Money = { readonly minor: number; readonly currency: CurrencyCode };

export const MAX_AMOUNT_MINOR = 10_000_000_000_000;

export class CurrencyMismatchError extends Error {
  constructor(expected: CurrencyCode, actual: CurrencyCode) {
    super(`Cannot combine ${expected} with ${actual}`);
    this.name = "CurrencyMismatchError";
  }
}

export class MoneyRangeError extends Error {
  constructor(value: number) {
    super(`Amount ${value} is not a safe integer`);
    this.name = "MoneyRangeError";
  }
}

export function money(minor: number, currency: CurrencyCode): Money {
  if (!Number.isSafeInteger(minor)) {
    throw new MoneyRangeError(minor);
  }
  // Adding 0 turns -0 into 0
  return { minor: minor + 0, currency };
}

export function zero(currency: CurrencyCode): Money {
  return money(0, currency);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor + b.minor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor - b.minor, a.currency);
}

export function negate(value: Money): Money {
  return money(0 - value.minor, value.currency);
}

export function sum(items: readonly Money[], currency: CurrencyCode): Money {
  return items.reduce(add, zero(currency));
}

export function sumByCurrency(items: readonly Money[]): Money[] {
  const totals: Money[] = [];
  for (const currency of CURRENCY_CODES) {
    const matching = items.filter((item) => item.currency === currency);
    if (matching.length > 0) {
      totals.push(sum(matching, currency));
    }
  }
  return totals;
}

export function isZero(value: Money): boolean {
  return value.minor === 0;
}

export function isNegative(value: Money): boolean {
  return value.minor < 0;
}
