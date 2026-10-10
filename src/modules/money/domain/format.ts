import { minorUnitOf } from "./currency";
import type { Money } from "./money";

export type FormatMoneyOptions = {
  currencyDisplay?: "narrowSymbol" | "code";
  signDisplay?: "auto" | "always" | "exceptZero";
};

export function toDecimalString(value: Money): string {
  const minorUnit = minorUnitOf(value.currency);
  const sign = value.minor < 0 ? "-" : "";
  const digits = String(Math.abs(value.minor));
  if (minorUnit === 0) {
    return sign + digits;
  }
  const padded = digits.padStart(minorUnit + 1, "0");
  const splitAt = padded.length - minorUnit;
  return `${sign}${padded.slice(0, splitAt)}.${padded.slice(splitAt)}`;
}

export function formatMoney(
  value: Money,
  options: FormatMoneyOptions = {},
): string {
  const minorUnit = minorUnitOf(value.currency);
  // English only for the MVP (requirements D3)
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: value.currency,
    currencyDisplay: options.currencyDisplay ?? "narrowSymbol",
    signDisplay: options.signDisplay ?? "auto",
    minimumFractionDigits: minorUnit,
    maximumFractionDigits: minorUnit,
  }).format(toDecimalString(value) as Intl.StringNumericLiteral);
}

// The symbol shown before an amount box, for example $ or ₭
export function currencySymbol(currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .filter((part) => part.type === "currency")
    .map((part) => part.value)
    .join("");
}

const TYPED_AMOUNT = /^(\d*)(\.\d*)?$/;

// Adds thousands commas to an amount while it is typed; text that is not a plain amount comes back unchanged
export function groupAmountInput(input: string): string {
  const plain = input.replaceAll(",", "");
  if (!TYPED_AMOUNT.test(plain)) return input;
  const dot = plain.indexOf(".");
  const whole = dot === -1 ? plain : plain.slice(0, dot);
  const decimals = dot === -1 ? "" : plain.slice(dot);
  return whole.replace(/\B(?=(\d{3})+$)/g, ",") + decimals;
}
