import { describe, expect, it } from "vitest";
import { CURRENCY_CODES, isCurrencyCode, minorUnitOf } from "./currency";

describe("isCurrencyCode", () => {
  it.each(["LAK", "USD", "THB", "VND", "SGD"])("accepts %s", (code) => {
    expect(isCurrencyCode(code)).toBe(true);
  });

  it.each(["lak", "GBP", "", "LAKK"])("rejects %j", (code) => {
    expect(isCurrencyCode(code)).toBe(false);
  });
});

describe("minorUnitOf", () => {
  it.each([
    ["LAK", 2],
    ["USD", 2],
    ["THB", 2],
    ["VND", 2],
    ["JPY", 2],
  ] as const)("%s has %i minor digits", (code, expected) => {
    expect(minorUnitOf(code)).toBe(expected);
  });
});

describe("CURRENCY_CODES", () => {
  it("lists kip, dollar and baht first, then the travel currencies by name", () => {
    expect(CURRENCY_CODES).toEqual([
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
    ]);
  });
});
