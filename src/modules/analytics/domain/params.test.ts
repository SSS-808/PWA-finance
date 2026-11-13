import { describe, expect, it } from "vitest";
import { parsePeriod, pickCurrency } from "./params";

describe("parsePeriod", () => {
  it("accepts 3, 6 and 12", () => {
    expect(parsePeriod("3")).toBe(3);
    expect(parsePeriod("6")).toBe(6);
    expect(parsePeriod("12")).toBe(12);
  });

  it("falls back to 6 for anything else", () => {
    expect(parsePeriod(undefined)).toBe(6);
    expect(parsePeriod("7")).toBe(6);
    expect(parsePeriod(["3"])).toBe(6);
    expect(parsePeriod(3)).toBe(6);
  });
});

describe("pickCurrency", () => {
  it("takes the asked currency when it is in use", () => {
    expect(pickCurrency("USD", ["THB", "USD"])).toBe("USD");
  });

  it("falls back to the first in use", () => {
    expect(pickCurrency("EUR", ["THB", "USD"])).toBe("THB");
    expect(pickCurrency(undefined, ["THB"])).toBe("THB");
    expect(pickCurrency(["USD"], ["THB"])).toBe("THB");
  });

  it("is null when none is in use", () => {
    expect(pickCurrency("USD", [])).toBeNull();
  });
});
