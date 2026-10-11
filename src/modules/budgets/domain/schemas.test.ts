import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import { budgetSchema, fieldErrorsFrom, parseBudgetAmount } from "./schemas";

const ID = "11111111-1111-4111-8111-111111111111";
const valid = { categoryId: ID, currency: "LAK", amount: "2,000,000" };

describe("parseBudgetAmount", () => {
  it("parses an amount with commas", () => {
    expect(parseBudgetAmount("2,000,000", "LAK")).toEqual({
      ok: true,
      value: money(2_000_000, "LAK"),
    });
    expect(parseBudgetAmount("12.5", "USD")).toEqual({
      ok: true,
      value: money(1250, "USD"),
    });
  });

  it.each([
    ["", "amount_required"],
    ["   ", "amount_required"],
    ["abc", "amount_invalid"],
    ["-5", "amount_invalid"],
    ["0", "amount_zero"],
    ["0.00", "amount_zero"],
    ["99999999999999999", "amount_too_large"],
  ])("refuses %j with %s", (input, error) => {
    expect(parseBudgetAmount(input, "LAK")).toEqual({ ok: false, error });
  });

  it("refuses too many decimals for the currency", () => {
    expect(parseBudgetAmount("1.5", "LAK")).toEqual({
      ok: false,
      error: "amount_too_many_decimals",
    });
    expect(parseBudgetAmount("1.005", "USD")).toEqual({
      ok: false,
      error: "amount_too_many_decimals",
    });
  });
});

describe("budgetSchema", () => {
  it("returns the amount as money", () => {
    expect(budgetSchema.parse(valid)).toEqual({
      categoryId: ID,
      currency: "LAK",
      amount: money(2_000_000, "LAK"),
    });
  });

  it("asks for a real category id", () => {
    const result = budgetSchema.safeParse({ ...valid, categoryId: "" });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      categoryId: "category_required",
    });
  });

  it.each(["", "EUR", "lak"])("refuses the currency %j", (currency) => {
    const result = budgetSchema.safeParse({ ...valid, currency });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      currency: "invalid_currency",
    });
  });

  it("reports an amount that does not fit the currency", () => {
    const zero = budgetSchema.safeParse({ ...valid, amount: "0" });
    expect(zero.error && fieldErrorsFrom(zero.error)).toEqual({
      amount: "amount_zero",
    });
    const decimals = budgetSchema.safeParse({ ...valid, amount: "1.5" });
    expect(decimals.error && fieldErrorsFrom(decimals.error)).toEqual({
      amount: "amount_too_many_decimals",
    });
  });
});

describe("fieldErrorsFrom", () => {
  it("falls back to unknown for a message that is not a key", () => {
    const result = budgetSchema.safeParse({ ...valid, amount: 42 });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      amount: "unknown",
    });
  });
});
