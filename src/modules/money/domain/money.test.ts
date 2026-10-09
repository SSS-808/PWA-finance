import { describe, expect, it } from "vitest";
import {
  CurrencyMismatchError,
  MoneyRangeError,
  add,
  isNegative,
  isZero,
  money,
  negate,
  subtract,
  sum,
  sumByCurrency,
  zero,
} from "./money";

describe("money", () => {
  it("creates an amount from integer minor units", () => {
    expect(money(100000, "LAK")).toEqual({ minor: 100000, currency: "LAK" });
  });

  it.each([1.5, NaN, Infinity, 2 ** 53])(
    "throws MoneyRangeError for %s",
    (value) => {
      expect(() => money(value, "USD")).toThrow(MoneyRangeError);
    },
  );

  it("describes the rejected value in the error", () => {
    expect(() => money(1.5, "USD")).toThrow("Amount 1.5 is not a safe integer");
    expect(() => money(1.5, "USD")).toThrow(
      expect.objectContaining({ name: "MoneyRangeError" }),
    );
  });

  it("never produces negative zero", () => {
    expect(Object.is(money(-0, "USD").minor, 0)).toBe(true);
    expect(Object.is(negate(zero("USD")).minor, 0)).toBe(true);
  });
});

describe("zero", () => {
  it("is an amount of 0 in the given currency", () => {
    expect(zero("THB")).toEqual({ minor: 0, currency: "THB" });
  });
});

describe("add and subtract", () => {
  it("adds amounts in the same currency", () => {
    expect(add(money(1250, "USD"), money(250, "USD"))).toEqual(
      money(1500, "USD"),
    );
  });

  it("subtracts amounts in the same currency", () => {
    expect(subtract(money(1250, "USD"), money(1500, "USD"))).toEqual(
      money(-250, "USD"),
    );
  });

  it("refuses to add different currencies", () => {
    expect(() => add(money(1, "LAK"), money(1, "USD"))).toThrow(
      CurrencyMismatchError,
    );
    expect(() => add(money(1, "LAK"), money(1, "USD"))).toThrow(
      "Cannot combine LAK with USD",
    );
    expect(() => add(money(1, "LAK"), money(1, "USD"))).toThrow(
      expect.objectContaining({ name: "CurrencyMismatchError" }),
    );
  });

  it("refuses to subtract different currencies", () => {
    expect(() => subtract(money(1, "THB"), money(1, "USD"))).toThrow(
      CurrencyMismatchError,
    );
  });

  it("throws MoneyRangeError when the total is not a safe integer", () => {
    const big = money(Number.MAX_SAFE_INTEGER, "LAK");
    expect(() => add(big, money(1, "LAK"))).toThrow(MoneyRangeError);
  });
});

describe("negate", () => {
  it("flips the sign", () => {
    expect(negate(money(1250, "USD"))).toEqual(money(-1250, "USD"));
  });
});

describe("sum", () => {
  it("is zero for an empty list", () => {
    expect(sum([], "THB")).toEqual({ minor: 0, currency: "THB" });
  });

  it("adds a list of amounts", () => {
    const items = [money(100, "USD"), money(250, "USD"), money(-50, "USD")];
    expect(sum(items, "USD")).toEqual(money(300, "USD"));
  });

  it("throws when an item has another currency", () => {
    const items = [money(100, "USD"), money(5000, "LAK")];
    expect(() => sum(items, "USD")).toThrow(CurrencyMismatchError);
  });

  it("throws when the first item has another currency", () => {
    expect(() => sum([money(5000, "LAK")], "USD")).toThrow(
      CurrencyMismatchError,
    );
  });

  it("is exact where floats are not", () => {
    // 0.1 * 10 in floats is not exactly 1
    const tenCents = Array.from({ length: 10 }, () => money(10, "USD"));
    expect(sum(tenCents, "USD")).toEqual(money(100, "USD"));
  });
});

describe("sumByCurrency", () => {
  it("gives one total per currency in CURRENCY_CODES order", () => {
    const items = [
      money(100, "USD"),
      money(5000, "LAK"),
      money(250, "USD"),
      money(1, "THB"),
      money(-2000, "LAK"),
    ];
    expect(sumByCurrency(items)).toEqual([
      money(3000, "LAK"),
      money(350, "USD"),
      money(1, "THB"),
    ]);
  });

  it("is empty for an empty list", () => {
    expect(sumByCurrency([])).toEqual([]);
  });

  it("gives a single total when only one currency is present", () => {
    expect(sumByCurrency([money(1, "THB"), money(2, "THB")])).toEqual([
      money(3, "THB"),
    ]);
  });
});

describe("isZero and isNegative", () => {
  it("isZero", () => {
    expect(isZero(money(0, "USD"))).toBe(true);
    expect(isZero(money(1, "USD"))).toBe(false);
    expect(isZero(money(-1, "USD"))).toBe(false);
  });

  it("isNegative", () => {
    expect(isNegative(money(-1, "USD"))).toBe(true);
    expect(isNegative(money(0, "USD"))).toBe(false);
    expect(isNegative(money(1, "USD"))).toBe(false);
  });
});
