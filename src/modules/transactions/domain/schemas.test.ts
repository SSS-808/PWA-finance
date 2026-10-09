import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import {
  MAX_NOTE_LENGTH,
  entrySchema,
  fieldErrorsFrom,
  isValidDate,
  parseEntryAmount,
} from "./schemas";

const ACCOUNT_ID = "22222222-2222-4222-8222-000000000001";
const CATEGORY_ID = "44444444-4444-4444-8444-000000000001";

const valid = {
  kind: "expense",
  amount: "45,000",
  accountId: ACCOUNT_ID,
  categoryId: CATEGORY_ID,
  date: "2026-10-09",
  note: "Lunch",
};

function firstMessage(input: unknown): string | undefined {
  return entrySchema.safeParse(input).error?.issues[0]?.message;
}

describe("parseEntryAmount", () => {
  it("makes an expense negative", () => {
    expect(parseEntryAmount("45,000", "LAK", "expense")).toEqual({
      ok: true,
      value: money(-45000, "LAK"),
    });
  });

  it("keeps an income positive", () => {
    expect(parseEntryAmount("12.50", "USD", "income")).toEqual({
      ok: true,
      value: money(1250, "USD"),
    });
  });

  it.each(["", "   ", "0", "0.00", "000"])(
    "refuses %j as required",
    (input) => {
      expect(parseEntryAmount(input, "USD", "expense")).toEqual({
        ok: false,
        error: "amount_required",
      });
    },
  );

  it.each([
    ["abc", "amount_invalid"],
    ["-5", "amount_negative"],
    ["1.005", "amount_too_many_decimals"],
    ["100000000000.01", "amount_too_large"],
  ] as const)("maps %j to %s", (input, error) => {
    expect(parseEntryAmount(input, "USD", "income")).toEqual({
      ok: false,
      error,
    });
  });

  it("checks the decimals of the account's own currency", () => {
    expect(parseEntryAmount("1000.5", "LAK", "expense")).toEqual({
      ok: false,
      error: "amount_too_many_decimals",
    });
    expect(parseEntryAmount("1000.5", "THB", "expense").ok).toBe(true);
  });
});

describe("isValidDate", () => {
  it.each(["2000-01-01", "2024-02-29", "2026-10-09", "2100-12-31"])(
    "accepts %s",
    (value) => {
      expect(isValidDate(value)).toBe(true);
    },
  );

  it.each([
    "",
    "abc",
    "2026-1-5",
    "2026/10/09",
    "1999-12-31",
    "2101-01-01",
    "2023-02-29",
    "2026-02-30",
    "2026-13-01",
    "2026-00-10",
    "2026-10-00",
  ])("rejects %j", (value) => {
    expect(isValidDate(value)).toBe(false);
  });
});

describe("entrySchema", () => {
  it("accepts a complete entry and tidies the note", () => {
    expect(entrySchema.parse(valid)).toEqual(valid);
    expect(entrySchema.parse({ ...valid, kind: "income" }).kind).toBe("income");
  });

  it("trims the amount and the note", () => {
    const result = entrySchema.parse({
      ...valid,
      amount: "  45000  ",
      note: "  Lunch  ",
    });
    expect(result.amount).toBe("45000");
    expect(result.note).toBe("Lunch");
  });

  it.each(["", "   "])("turns the note %j into null", (note) => {
    expect(entrySchema.parse({ ...valid, note }).note).toBeNull();
  });

  it("limits the note to 200 characters", () => {
    expect(MAX_NOTE_LENGTH).toBe(200);
    expect(
      entrySchema.safeParse({ ...valid, note: "a".repeat(200) }).success,
    ).toBe(true);
    expect(firstMessage({ ...valid, note: "a".repeat(201) })).toBe(
      "note_too_long",
    );
  });

  it("trims the note before counting it", () => {
    const result = entrySchema.parse({
      ...valid,
      note: ` ${"a".repeat(200)} `,
    });
    expect(result.note).toBe("a".repeat(200));
  });

  it.each(["transfer", "", "Expense"])("rejects the kind %j", (kind) => {
    expect(entrySchema.safeParse({ ...valid, kind }).success).toBe(false);
  });

  it.each([
    ["", "amount_required"],
    ["0", "amount_required"],
    ["abc", "amount_invalid"],
    ["-5", "amount_negative"],
  ])("refuses the amount %j with %s", (amount, key) => {
    expect(firstMessage({ ...valid, amount })).toBe(key);
  });

  it("leaves decimals and size to the account's currency", () => {
    expect(entrySchema.safeParse({ ...valid, amount: "1.005" }).success).toBe(
      true,
    );
    expect(
      entrySchema.safeParse({ ...valid, amount: "100000000000.01" }).success,
    ).toBe(true);
  });

  it.each(["", "not-a-uuid"])("requires an account, not %j", (accountId) => {
    expect(firstMessage({ ...valid, accountId })).toBe("account_required");
  });

  it.each(["", "not-a-uuid"])("requires a category, not %j", (categoryId) => {
    expect(firstMessage({ ...valid, categoryId })).toBe("category_required");
  });

  it.each(["", "2026-02-30", "1999-12-31", "yesterday"])(
    "refuses the date %j",
    (date) => {
      expect(firstMessage({ ...valid, date })).toBe("invalid_date");
    },
  );
});

describe("fieldErrorsFrom", () => {
  it("gives one key per field", () => {
    const result = entrySchema.safeParse({
      ...valid,
      amount: "",
      categoryId: "",
      date: "nope",
    });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      amount: "amount_required",
      categoryId: "category_required",
      date: "invalid_date",
    });
  });

  it("maps a message that is not a key to unknown", () => {
    const result = entrySchema.safeParse({ ...valid, kind: "transfer" });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      kind: "unknown",
    });
  });
});
