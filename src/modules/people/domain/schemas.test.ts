import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import {
  NEW_PERSON,
  NO_ACCOUNT,
  dueSchema,
  fieldErrorsFrom,
  isValidDate,
  moveSchema,
  nameSchema,
  parseAmount,
  repaySchema,
} from "./schemas";

const ID = "5f0b1f0e-3b0a-4f3e-9c1a-2d4f6a8b0c1d";

const valid = {
  kind: "lend",
  person: ID,
  newName: "",
  account: ID,
  currency: "",
  amount: "100,000",
  date: "2026-11-24",
  dueOn: "",
  note: "",
};

describe("isValidDate", () => {
  it("accepts real dates inside the range and rejects the rest", () => {
    expect(isValidDate("2026-11-24")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("1999-12-31")).toBe(false);
    expect(isValidDate("24/11/2026")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});

describe("parseAmount", () => {
  it("returns a positive amount", () => {
    expect(parseAmount("1,500.5", "THB")).toEqual({
      ok: true,
      value: money(150050, "THB"),
    });
  });

  it("names the problem", () => {
    expect(parseAmount("", "LAK")).toEqual({
      ok: false,
      error: "amount_required",
    });
    expect(parseAmount("", "LAK", "account_amount_required")).toEqual({
      ok: false,
      error: "account_amount_required",
    });
    expect(parseAmount("0", "LAK")).toEqual({
      ok: false,
      error: "amount_required",
    });
    expect(parseAmount("abc", "LAK")).toEqual({
      ok: false,
      error: "amount_invalid",
    });
    expect(parseAmount("-5", "LAK")).toEqual({
      ok: false,
      error: "amount_negative",
    });
    expect(parseAmount("1.234", "LAK")).toEqual({
      ok: false,
      error: "amount_too_many_decimals",
    });
    expect(parseAmount("99999999999999999", "LAK")).toEqual({
      ok: false,
      error: "amount_too_large",
    });
  });
});

describe("moveSchema", () => {
  it("accepts a lend and cleans the note and date", () => {
    const result = moveSchema.parse({ ...valid, note: "  rent " });
    expect(result.note).toBe("rent");
    expect(result.dueOn).toBeNull();
    expect(moveSchema.parse({ ...valid, note: "" }).note).toBeNull();
  });

  it("accepts a new person with a name and no account", () => {
    const result = moveSchema.parse({
      ...valid,
      kind: "borrow",
      person: NEW_PERSON,
      newName: " Nok ",
      account: NO_ACCOUNT,
      currency: "THB",
      dueOn: "2026-12-01",
    });
    expect(result.dueOn).toBe("2026-12-01");
  });

  it("reports one error per field", () => {
    const result = moveSchema.safeParse({
      ...valid,
      kind: "x",
      person: "x",
      account: "x",
      date: "nope",
      dueOn: "nope",
      note: "n".repeat(201),
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrorsFrom(result.error)).toEqual({
      kind: "unknown",
      person: "person_required",
      account: "account_required",
      date: "date_invalid",
      dueOn: "date_invalid",
      note: "note_too_long",
    });
  });

  it("needs a name for a new person", () => {
    const empty = moveSchema.safeParse({ ...valid, person: NEW_PERSON });
    const long = moveSchema.safeParse({
      ...valid,
      person: NEW_PERSON,
      newName: "n".repeat(41),
    });
    expect(empty.success || fieldErrorsFrom(empty.error)).toEqual({
      newName: "name_required",
    });
    expect(long.success || fieldErrorsFrom(long.error)).toEqual({
      newName: "name_too_long",
    });
  });
});

describe("repaySchema", () => {
  it("needs an account and a real date", () => {
    expect(
      repaySchema.safeParse({
        amount: "5",
        account: ID,
        accountAmount: "",
        date: "2026-11-24",
      }).success,
    ).toBe(true);
    const bad = repaySchema.safeParse({
      amount: "5",
      account: "",
      accountAmount: "",
      date: "x",
    });
    expect(bad.success || fieldErrorsFrom(bad.error)).toEqual({
      account: "account_required",
      date: "date_invalid",
    });
  });
});

describe("nameSchema and dueSchema", () => {
  it("trim the name and let the date stay empty", () => {
    expect(nameSchema.parse(" Nok ")).toBe("Nok");
    expect(nameSchema.safeParse("").success).toBe(false);
    expect(dueSchema.parse("")).toBeNull();
    expect(dueSchema.parse("2026-12-01")).toBe("2026-12-01");
    expect(dueSchema.safeParse("2026-13-01").success).toBe(false);
  });
});

describe("fieldErrorsFrom", () => {
  it("falls back to unknown for a message that is not a key", () => {
    const result = repaySchema.safeParse({
      amount: "",
      account: ID,
      accountAmount: "",
      date: 5,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrorsFrom(result.error).date).toBeDefined();
  });
});
