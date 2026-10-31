import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import {
  MAX_NAME_LENGTH,
  accountFieldsSchema,
  createAccountSchema,
  fieldErrorsFrom,
  parseMinimum,
  parseStartingAmount,
} from "./schemas";

const valid = {
  name: "Cash",
  type: "cash",
  startingAmount: "",
  minimum: "",
  currency: "LAK",
};

describe("accountFieldsSchema", () => {
  it("accepts valid fields", () => {
    expect(
      accountFieldsSchema.parse({
        name: "Cash",
        type: "cash",
        startingAmount: "10",
        minimum: "5",
      }),
    ).toEqual({
      name: "Cash",
      type: "cash",
      startingAmount: "10",
      minimum: "5",
    });
  });

  it.each(["", "   "])("requires a name, not %j", (name) => {
    const result = accountFieldsSchema.safeParse({ ...valid, name });
    expect(result.error?.issues[0]?.message).toBe("name_required");
  });

  it("limits the name to 60 characters", () => {
    expect(MAX_NAME_LENGTH).toBe(60);
    expect(
      accountFieldsSchema.safeParse({ ...valid, name: "a".repeat(60) }).success,
    ).toBe(true);
    const over = accountFieldsSchema.safeParse({
      ...valid,
      name: "a".repeat(61),
    });
    expect(over.error?.issues[0]?.message).toBe("name_too_long");
  });

  it("trims the name before counting it", () => {
    const result = accountFieldsSchema.parse({
      ...valid,
      name: `  ${"a".repeat(60)}  `,
    });
    expect(result.name).toBe("a".repeat(60));
  });

  it.each(["", "Cash", "wallet"])("rejects the type %j", (type) => {
    const result = accountFieldsSchema.safeParse({ ...valid, type });
    expect(result.error?.issues[0]?.message).toBe("invalid_type");
  });
});

describe("createAccountSchema", () => {
  it.each(["LAK", "USD", "THB"])("accepts the currency %s", (currency) => {
    expect(createAccountSchema.safeParse({ ...valid, currency }).success).toBe(
      true,
    );
  });

  it.each(["EUR", "", "lak"])("rejects the currency %j", (currency) => {
    const result = createAccountSchema.safeParse({ ...valid, currency });
    expect(result.error?.issues[0]?.message).toBe("invalid_currency");
  });
});

describe("fieldErrorsFrom", () => {
  it("maps each failing field to its error key", () => {
    const result = createAccountSchema.safeParse({
      name: "",
      type: "wallet",
      startingAmount: "",
      minimum: "",
      currency: "EUR",
    });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      name: "name_required",
      type: "invalid_type",
      currency: "invalid_currency",
    });
  });

  it("falls back to unknown for a message that is not a key", () => {
    const result = createAccountSchema.safeParse({ ...valid, name: 42 });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      name: "unknown",
    });
  });
});

describe("parseStartingAmount", () => {
  it.each(["", "   "])("treats %j as 0", (input) => {
    expect(parseStartingAmount(input, "cash", "USD")).toEqual({
      ok: true,
      value: money(0, "USD"),
    });
  });

  it("reads a kip amount with commas", () => {
    expect(parseStartingAmount("1,500,000", "cash", "LAK")).toEqual({
      ok: true,
      value: money(1500000, "LAK"),
    });
  });

  it("reads a dollar amount in cents", () => {
    expect(parseStartingAmount("12.5", "bank", "USD")).toEqual({
      ok: true,
      value: money(1250, "USD"),
    });
  });

  it("stores what you owe on a debt as a negative amount", () => {
    expect(parseStartingAmount("30", "credit_card", "USD")).toEqual({
      ok: true,
      value: money(-3000, "USD"),
    });
    expect(parseStartingAmount("500", "loan", "LAK")).toEqual({
      ok: true,
      value: money(-500, "LAK"),
    });
  });

  it("keeps 0 as 0 for a debt", () => {
    expect(parseStartingAmount("0", "loan", "USD")).toEqual({
      ok: true,
      value: money(0, "USD"),
    });
  });

  it.each([
    ["-5", "amount_negative"],
    ["1.005", "amount_too_many_decimals"],
    ["99999999999999", "amount_too_large"],
    ["abc", "amount_invalid"],
    [".", "amount_invalid"],
  ])("refuses %j with %s", (input, error) => {
    expect(parseStartingAmount(input, "cash", "USD")).toEqual({
      ok: false,
      error,
    });
  });

  it("refuses a minus sign on a debt too", () => {
    expect(parseStartingAmount("-30", "credit_card", "USD")).toEqual({
      ok: false,
      error: "amount_negative",
    });
  });
});

describe("parseMinimum", () => {
  it.each(["", "   "])("treats %j as 0", (input) => {
    expect(parseMinimum(input, "bank", "USD")).toEqual({
      ok: true,
      value: money(0, "USD"),
    });
  });

  it("reads a kip amount with commas", () => {
    expect(parseMinimum("50,000", "bank", "LAK")).toEqual({
      ok: true,
      value: money(50000, "LAK"),
    });
  });

  it("reads a dollar amount in cents", () => {
    expect(parseMinimum("10", "bank", "USD")).toEqual({
      ok: true,
      value: money(1000, "USD"),
    });
  });

  it("keeps 0 as 0", () => {
    expect(parseMinimum("0", "savings", "THB")).toEqual({
      ok: true,
      value: money(0, "THB"),
    });
  });

  it.each([
    ["-5", "minimum_negative"],
    ["1.005", "amount_too_many_decimals"],
    ["99999999999999", "amount_too_large"],
    ["abc", "amount_invalid"],
    [".", "amount_invalid"],
  ])("refuses %j with %s", (input, error) => {
    expect(parseMinimum(input, "bank", "USD")).toEqual({ ok: false, error });
  });

  it.each(["credit_card", "loan"] as const)(
    "forces 0 on %s, whatever was typed",
    (type) => {
      expect(parseMinimum("50", type, "USD")).toEqual({
        ok: true,
        value: money(0, "USD"),
      });
      expect(parseMinimum("abc", type, "USD")).toEqual({
        ok: true,
        value: money(0, "USD"),
      });
    },
  );
});
