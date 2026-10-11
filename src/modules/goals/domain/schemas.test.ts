import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import {
  contributionSchema,
  fieldErrorsFrom,
  goalSchema,
  isValidDeadline,
  parseGoalAmount,
} from "./schemas";

const valid = {
  name: "Laptop",
  currency: "LAK",
  target: "10,000,000",
  deadline: "",
};

function errorsOf(input: unknown) {
  const result = goalSchema.safeParse(input);
  return result.error && fieldErrorsFrom(result.error);
}

describe("parseGoalAmount", () => {
  it("parses an amount with commas", () => {
    expect(parseGoalAmount("2,000,000", "LAK")).toEqual({
      ok: true,
      value: money(2_000_000, "LAK"),
    });
    expect(parseGoalAmount("12.5", "USD")).toEqual({
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
    ["1.5", "amount_too_many_decimals"],
  ])("refuses %j with %s", (input, error) => {
    expect(parseGoalAmount(input, "LAK")).toEqual({ ok: false, error });
  });
});

describe("isValidDeadline", () => {
  it.each(["2026-10-31", "2000-01-01", "2100-12-31", "2028-02-29"])(
    "accepts %s",
    (value) => {
      expect(isValidDeadline(value)).toBe(true);
    },
  );

  it.each([
    "",
    "tomorrow",
    "2026-1-5",
    "2026/10/31",
    "2026-13-01",
    "2026-00-10",
    "2026-02-30",
    "2026-02-29",
    "2026-04-31",
    "1999-12-31",
    "2101-01-01",
  ])("refuses %j", (value) => {
    expect(isValidDeadline(value)).toBe(false);
  });
});

describe("goalSchema", () => {
  it("returns the target as money and no deadline as null", () => {
    expect(goalSchema.parse(valid)).toEqual({
      name: "Laptop",
      currency: "LAK",
      target: money(10_000_000, "LAK"),
      deadline: null,
    });
  });

  it("trims the name and the deadline", () => {
    expect(
      goalSchema.parse({
        ...valid,
        name: "  Japan trip  ",
        deadline: " 2027-03-31 ",
      }),
    ).toMatchObject({ name: "Japan trip", deadline: "2027-03-31" });
  });

  it("accepts a name of exactly 60 characters", () => {
    const result = goalSchema.safeParse({ ...valid, name: "a".repeat(60) });
    expect(result.success).toBe(true);
  });

  it.each([
    ["", "name_required"],
    ["   ", "name_required"],
    ["a".repeat(61), "name_too_long"],
  ])("refuses the name %j with %s", (name, error) => {
    expect(errorsOf({ ...valid, name })).toEqual({ name: error });
  });

  it.each(["", "EUR", "lak"])("refuses the currency %j", (currency) => {
    expect(errorsOf({ ...valid, currency })).toEqual({
      currency: "invalid_currency",
    });
  });

  it.each([
    ["", "amount_required"],
    ["abc", "amount_invalid"],
    ["0", "amount_zero"],
    ["1.5", "amount_too_many_decimals"],
    ["99999999999999999", "amount_too_large"],
  ])("refuses the target %j with %s", (target, error) => {
    expect(errorsOf({ ...valid, target })).toEqual({ target: error });
  });

  it.each(["2026-02-30", "soon", "1999-01-01"])(
    "refuses the deadline %j",
    (deadline) => {
      expect(errorsOf({ ...valid, deadline })).toEqual({
        deadline: "invalid_date",
      });
    },
  );

  it("maps a message that is not a known key to unknown", () => {
    expect(errorsOf({ ...valid, name: 5 })).toEqual({ name: "unknown" });
  });
});

describe("contributionSchema", () => {
  const input = { currency: "LAK", amount: "7,000,000", direction: "add" };

  it("adds money as a positive amount", () => {
    expect(contributionSchema.parse(input)).toEqual({
      currency: "LAK",
      amount: money(7_000_000, "LAK"),
    });
  });

  it("takes money out as a negative amount", () => {
    expect(contributionSchema.parse({ ...input, direction: "take" })).toEqual({
      currency: "LAK",
      amount: money(-7_000_000, "LAK"),
    });
  });

  it.each([
    ["", "amount_required"],
    ["abc", "amount_invalid"],
    ["-5", "amount_invalid"],
    ["0", "amount_zero"],
    ["1.5", "amount_too_many_decimals"],
    ["99999999999999999", "amount_too_large"],
  ])("refuses the amount %j with %s", (amount, error) => {
    const result = contributionSchema.safeParse({ ...input, amount });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      amount: error,
    });
  });

  it.each(["", "sideways", "ADD"])("refuses the direction %j", (direction) => {
    const result = contributionSchema.safeParse({ ...input, direction });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      direction: "unknown",
    });
  });

  it("refuses a currency that is not supported", () => {
    const result = contributionSchema.safeParse({ ...input, currency: "EUR" });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      currency: "invalid_currency",
    });
  });
});
