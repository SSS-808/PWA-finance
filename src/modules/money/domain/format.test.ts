import { describe, expect, it } from "vitest";
import type { CurrencyCode } from "./currency";
import {
  currencySymbol,
  formatMoney,
  groupAmountInput,
  toDecimalString,
} from "./format";
import { type Money, money } from "./money";
import { parseMoney } from "./parse";

describe("toDecimalString", () => {
  it.each<[CurrencyCode, number, string]>([
    ["LAK", 100000, "100000"],
    ["USD", 1250, "12.50"],
    ["USD", 5, "0.05"],
    ["USD", -5, "-0.05"],
    ["USD", 0, "0.00"],
    ["THB", 35025, "350.25"],
  ])("%s %i becomes %j", (currency, minor, expected) => {
    expect(toDecimalString(money(minor, currency))).toBe(expected);
  });
});

describe("formatMoney", () => {
  it.each<[CurrencyCode, number, string]>([
    ["LAK", 100000, "₭100,000"],
    ["USD", 1250, "$12.50"],
    ["USD", -1250, "-$12.50"],
    ["THB", 35025, "฿350.25"],
    ["USD", 0, "$0.00"],
    ["USD", 10000000000000, "$100,000,000,000.00"],
  ])("%s %i displays as %s", (currency, minor, expected) => {
    expect(formatMoney(money(minor, currency))).toBe(expected);
  });

  it("can show the currency code", () => {
    expect(formatMoney(money(100000, "LAK"), { currencyDisplay: "code" })).toBe(
      "LAK\u00A0100,000",
    );
    expect(formatMoney(money(1250, "USD"), { currencyDisplay: "code" })).toBe(
      "USD\u00A012.50",
    );
  });

  it("can always show the sign", () => {
    expect(formatMoney(money(1250, "USD"), { signDisplay: "always" })).toBe(
      "+$12.50",
    );
  });

  it("can hide the sign on zero", () => {
    expect(formatMoney(money(0, "USD"), { signDisplay: "exceptZero" })).toBe(
      "$0.00",
    );
  });
});

describe("round trip: toDecimalString then parseMoney", () => {
  const samples: Money[] = [
    money(0, "LAK"),
    money(1, "LAK"),
    money(100000, "LAK"),
    money(10000000000000, "LAK"),
    money(-45000, "LAK"),
    money(0, "USD"),
    money(5, "USD"),
    money(-5, "USD"),
    money(1250, "USD"),
    money(10000000000000, "USD"),
    money(-10000000000000, "USD"),
    money(35025, "THB"),
  ];

  it.each(samples)("$currency $minor", (sample) => {
    expect(
      parseMoney(toDecimalString(sample), sample.currency, {
        allowNegative: true,
      }),
    ).toEqual({ ok: true, value: sample });
  });
});

describe("currencySymbol", () => {
  it.each<[CurrencyCode, string]>([
    ["LAK", "₭"],
    ["USD", "$"],
    ["THB", "฿"],
  ])("%s is shown as %s", (currency, expected) => {
    expect(currencySymbol(currency)).toBe(expected);
  });
});

describe("groupAmountInput", () => {
  it.each<[string, string]>([
    ["", ""],
    ["1", "1"],
    ["999", "999"],
    ["1000", "1,000"],
    ["1000000", "1,000,000"],
    ["1,000000", "1,000,000"],
    ["10,00", "1,000"],
    ["1234.5", "1,234.5"],
    ["1234.", "1,234."],
    [".5", ".5"],
    ["0012345", "0,012,345"],
    ["100.00", "100.00"],
    ["-1000", "-1000"],
    ["12a4", "12a4"],
    ["1.2.3", "1.2.3"],
  ])("%j becomes %j", (input, expected) => {
    expect(groupAmountInput(input)).toBe(expected);
  });
});
