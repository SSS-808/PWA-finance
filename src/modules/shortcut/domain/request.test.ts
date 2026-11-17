import { describe, expect, it } from "vitest";
import {
  addResultSchema,
  cleanAmount,
  readBearerKey,
  shortcutBodySchema,
} from "./request";

const key = `pw_${"a".repeat(40)}B-_`;

describe("readBearerKey", () => {
  it("reads a well-formed key", () => {
    expect(readBearerKey(`Bearer ${key}`)).toBe(key);
    expect(readBearerKey(`  bearer   ${key} `)).toBe(key);
  });

  it("refuses a missing header, another scheme or a wrong shape", () => {
    expect(readBearerKey(null)).toBeNull();
    expect(readBearerKey("")).toBeNull();
    expect(readBearerKey(`Basic ${key}`)).toBeNull();
    expect(readBearerKey(key)).toBeNull();
    expect(readBearerKey("Bearer pw_short")).toBeNull();
    expect(readBearerKey(`Bearer ${key}x`)).toBeNull();
    expect(readBearerKey(`Bearer sk_${"a".repeat(43)}`)).toBeNull();
    expect(readBearerKey(`Bearer ${key} extra`)).toBeNull();
  });
});

describe("cleanAmount", () => {
  it("keeps only digits, commas and dots", () => {
    expect(cleanAmount("₭25,000")).toBe("25,000");
    expect(cleanAmount("25,000.00 LAK")).toBe("25,000.00");
    expect(cleanAmount(" 12.50 ")).toBe("12.50");
    expect(cleanAmount("-300")).toBe("300");
    expect(cleanAmount("LAK")).toBe("");
  });
});

describe("shortcutBodySchema", () => {
  it("accepts the amount as text or a number, with optional category and note", () => {
    expect(shortcutBodySchema.parse({ amount: "25,000" })).toEqual({
      amount: "25,000",
      category: "",
      note: "",
    });
    expect(
      shortcutBodySchema.parse({
        amount: 25000,
        category: " Food ",
        note: " Noodles ",
      }),
    ).toEqual({ amount: "25000", category: "Food", note: "Noodles" });
  });

  it("refuses a missing or empty amount and over-long fields", () => {
    expect(shortcutBodySchema.safeParse({}).success).toBe(false);
    expect(shortcutBodySchema.safeParse({ amount: "  " }).success).toBe(false);
    expect(shortcutBodySchema.safeParse({ amount: true }).success).toBe(false);
    expect(
      shortcutBodySchema.safeParse({ amount: "1".repeat(41) }).success,
    ).toBe(false);
    expect(
      shortcutBodySchema.safeParse({ amount: "1", note: "n".repeat(201) })
        .success,
    ).toBe(false);
    expect(
      shortcutBodySchema.safeParse({ amount: "1", category: "c".repeat(61) })
        .success,
    ).toBe(false);
  });
});

describe("addResultSchema", () => {
  it("reads a saved entry and every refusal", () => {
    expect(
      addResultSchema.parse({
        status: "saved",
        id: "x",
        amount_minor: 2500000,
        currency: "LAK",
        account: "BCEL One",
        category: "Food",
      }),
    ).toEqual({
      status: "saved",
      amount_minor: 2500000,
      currency: "LAK",
      account: "BCEL One",
      category: "Food",
    });
    expect(addResultSchema.parse({ status: "duplicate" })).toEqual({
      status: "duplicate",
    });
  });

  it("refuses an answer it doesn't know", () => {
    expect(addResultSchema.safeParse({ status: "other" }).success).toBe(false);
    expect(addResultSchema.safeParse({ status: "saved" }).success).toBe(false);
    expect(addResultSchema.safeParse(null).success).toBe(false);
  });
});
