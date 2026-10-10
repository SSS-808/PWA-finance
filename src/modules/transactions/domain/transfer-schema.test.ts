import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import { fieldErrorsFrom } from "./schemas";
import {
  parseTransferAmounts,
  transferSchema,
  transferSchemaFor,
} from "./transfer-schema";

const FROM_ID = "22222222-2222-4222-8222-000000000001";
const TO_ID = "22222222-2222-4222-8222-000000000002";

const valid = {
  fromAccountId: FROM_ID,
  toAccountId: TO_ID,
  amount: "500,000",
  arrived: "",
  date: "2026-10-09",
  note: "Cash out",
};

function errorsOf(
  schema: ReturnType<typeof transferSchemaFor>,
  input: unknown,
) {
  const result = schema.safeParse(input);
  return result.success ? {} : fieldErrorsFrom(result.error);
}

describe("parseTransferAmounts", () => {
  it("uses one amount for both sides when the currency is the same", () => {
    expect(parseTransferAmounts("500,000", "", "LAK", "LAK")).toEqual({
      ok: true,
      from: money(500000, "LAK"),
      to: money(500000, "LAK"),
    });
  });

  it("ignores the arrived box when the currency is the same", () => {
    expect(parseTransferAmounts("12.50", "not a number", "USD", "USD")).toEqual(
      { ok: true, from: money(1250, "USD"), to: money(1250, "USD") },
    );
  });

  it("reads both amounts when the currencies differ", () => {
    expect(parseTransferAmounts("100", "2,150,000", "USD", "LAK")).toEqual({
      ok: true,
      from: money(10000, "USD"),
      to: money(2150000, "LAK"),
    });
  });

  it("checks the decimals of each side's own currency", () => {
    expect(parseTransferAmounts("100.5", "2150000", "USD", "LAK").ok).toBe(
      true,
    );
    expect(parseTransferAmounts("100", "2150000.5", "USD", "LAK")).toEqual({
      ok: false,
      field: "arrived",
      error: "amount_too_many_decimals",
    });
    expect(parseTransferAmounts("1000.5", "1", "LAK", "USD")).toEqual({
      ok: false,
      field: "amount",
      error: "amount_too_many_decimals",
    });
  });

  it.each(["", "   ", "0", "0.00"])("refuses %j as the amount", (input) => {
    expect(parseTransferAmounts(input, "100", "USD", "LAK")).toEqual({
      ok: false,
      field: "amount",
      error: "amount_required",
    });
  });

  it.each(["", "   ", "0"])("asks for the arrived amount when %j", (input) => {
    expect(parseTransferAmounts("100", input, "USD", "LAK")).toEqual({
      ok: false,
      field: "arrived",
      error: "arrived_required",
    });
  });

  it.each([
    ["abc", "amount_invalid"],
    ["-5", "amount_negative"],
    ["100000000000.01", "amount_too_large"],
  ] as const)("maps %j in the arrived box to %s", (input, error) => {
    expect(parseTransferAmounts("1", input, "USD", "THB")).toEqual({
      ok: false,
      field: "arrived",
      error,
    });
  });

  it("checks the first amount before the arrived one", () => {
    expect(parseTransferAmounts("abc", "", "USD", "LAK")).toEqual({
      ok: false,
      field: "amount",
      error: "amount_invalid",
    });
  });
});

describe("transferSchema", () => {
  it("accepts a good transfer and turns an empty note into null", () => {
    expect(transferSchema.parse({ ...valid, note: "  " })).toEqual({
      ...valid,
      note: null,
    });
  });

  it("trims the note", () => {
    expect(transferSchema.parse({ ...valid, note: "  hi  " }).note).toBe("hi");
  });

  it("refuses the same account twice, on the To box", () => {
    expect(
      errorsOf(transferSchema, { ...valid, toAccountId: FROM_ID }),
    ).toEqual({ toAccountId: "same_account" });
  });

  it("asks for the To account when it is empty, even if From is empty too", () => {
    expect(errorsOf(transferSchema, { ...valid, toAccountId: "" })).toEqual({
      toAccountId: "account_required",
    });
    expect(
      errorsOf(transferSchema, {
        ...valid,
        fromAccountId: "",
        toAccountId: "",
      }),
    ).toEqual({
      fromAccountId: "account_required",
      toAccountId: "account_required",
    });
  });

  it.each(["", "abc", "0", "-1"])("refuses %j as the amount", (amount) => {
    expect(Object.keys(errorsOf(transferSchema, { ...valid, amount }))).toEqual(
      ["amount"],
    );
  });

  it("leaves the decimals and size of the amount to the server", () => {
    expect(
      transferSchema.safeParse({ ...valid, amount: "1000.5" }).success,
    ).toBe(true);
  });

  it("does not look at the arrived box", () => {
    expect(
      transferSchema.safeParse({ ...valid, arrived: "not a number" }).success,
    ).toBe(true);
  });

  it.each(["", "2026-02-30", "09/10/2026", "1999-12-31"])(
    "refuses the date %j",
    (date) => {
      expect(errorsOf(transferSchema, { ...valid, date })).toEqual({
        date: "invalid_date",
      });
    },
  );

  it("allows a note of 200 characters but not 201", () => {
    expect(
      transferSchema.safeParse({ ...valid, note: "a".repeat(200) }).success,
    ).toBe(true);
    expect(
      errorsOf(transferSchema, { ...valid, note: "a".repeat(201) }),
    ).toEqual({ note: "note_too_long" });
  });

  it("reports several fields at once", () => {
    expect(
      errorsOf(transferSchema, {
        ...valid,
        toAccountId: FROM_ID,
        amount: "",
      }),
    ).toEqual({ toAccountId: "same_account", amount: "amount_required" });
  });
});

describe("transferSchemaFor(true)", () => {
  const schema = transferSchemaFor(true);

  it("asks for the arrived amount", () => {
    expect(errorsOf(schema, valid)).toEqual({ arrived: "arrived_required" });
    expect(errorsOf(schema, { ...valid, arrived: "  " })).toEqual({
      arrived: "arrived_required",
    });
  });

  it.each([
    ["abc", "amount_invalid"],
    ["-5", "amount_negative"],
    ["0", "arrived_required"],
  ] as const)("maps %j in the arrived box to %s", (arrived, error) => {
    expect(errorsOf(schema, { ...valid, arrived })).toEqual({ arrived: error });
  });

  it("accepts a good arrived amount", () => {
    expect(schema.safeParse({ ...valid, arrived: "2,150,000" }).success).toBe(
      true,
    );
  });
});
