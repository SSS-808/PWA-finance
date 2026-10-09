import { type CurrencyCode, minorUnitOf } from "./currency";
import { MAX_AMOUNT_MINOR, type Money, money } from "./money";

export type ParseMoneyError =
  "empty" | "invalid" | "negative" | "too_many_decimals" | "too_large";

export type ParseMoneyOptions = { allowNegative?: boolean };

export type ParseMoneyResult =
  { ok: true; value: Money } | { ok: false; error: ParseMoneyError };

const AMOUNT_PATTERN = /^(-)?(\d*)(?:\.(\d*))?$/;

// 14 digits is the longest string that converts to an exact Number within the limit
const MAX_DIGITS = 14;

export function parseMoney(
  input: string,
  currency: CurrencyCode,
  options: ParseMoneyOptions = {},
): ParseMoneyResult {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { ok: false, error: "empty" };
  }

  const match = AMOUNT_PATTERN.exec(trimmed.replaceAll(",", ""));
  if (match === null) {
    return { ok: false, error: "invalid" };
  }
  const negative = match[1] === "-";
  // Group 2 always takes part in a match, so it is never undefined
  const intDigits = match[2] as string;
  const fractionDigits = match[3] ?? "";
  if (intDigits === "" && fractionDigits === "") {
    return { ok: false, error: "invalid" };
  }

  if (negative && !options.allowNegative) {
    return { ok: false, error: "negative" };
  }

  const minorUnit = minorUnitOf(currency);
  const keptFraction = fractionDigits.slice(0, minorUnit);
  const extraFraction = fractionDigits.slice(minorUnit);
  if (/[1-9]/.test(extraFraction)) {
    return { ok: false, error: "too_many_decimals" };
  }

  const digits = (intDigits + keptFraction.padEnd(minorUnit, "0")).replace(
    /^0+/,
    "",
  );
  const normalized = digits === "" ? "0" : digits;
  if (normalized.length > MAX_DIGITS || Number(normalized) > MAX_AMOUNT_MINOR) {
    return { ok: false, error: "too_large" };
  }

  const minor = negative ? 0 - Number(normalized) : Number(normalized);
  return { ok: true, value: money(minor, currency) };
}
