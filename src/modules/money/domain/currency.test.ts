import { describe, expect, it } from "vitest";
import { CURRENCY_CODES, isCurrencyCode, minorUnitOf } from "./currency";

describe("isCurrencyCode", () => {
  it.each(["LAK", "USD", "THB"])("accepts %s", (code) => {
    expect(isCurrencyCode(code)).toBe(true);
  });

  it.each(["lak", "EUR", "", "LAKK"])("rejects %j", (code) => {
    expect(isCurrencyCode(code)).toBe(false);
  });
});

describe("minorUnitOf", () => {
  it.each([
    ["LAK", 0],
    ["USD", 2],
    ["THB", 2],
  ] as const)("%s has %i minor digits", (code, expected) => {
    expect(minorUnitOf(code)).toBe(expected);
  });
});

describe("CURRENCY_CODES", () => {
  it("lists the supported currencies in display order", () => {
    expect(CURRENCY_CODES).toEqual(["LAK", "USD", "THB"]);
  });
});
