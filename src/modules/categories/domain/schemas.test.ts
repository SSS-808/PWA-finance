import { describe, expect, it } from "vitest";
import {
  MAX_NAME_LENGTH,
  categoryFieldsSchema,
  createCategorySchema,
  fieldErrorsFrom,
  isCategoryKind,
} from "./schemas";

const valid = { name: "Coffee", kind: "expense" };

describe("categoryFieldsSchema", () => {
  it("accepts a name and trims it", () => {
    expect(categoryFieldsSchema.parse({ name: "  Coffee  " })).toEqual({
      name: "Coffee",
    });
  });

  it.each(["", "   "])("requires a name, not %j", (name) => {
    const result = categoryFieldsSchema.safeParse({ name });
    expect(result.error?.issues[0]?.message).toBe("name_required");
  });

  it("limits the name to 40 characters", () => {
    expect(MAX_NAME_LENGTH).toBe(40);
    expect(
      categoryFieldsSchema.safeParse({ name: "a".repeat(40) }).success,
    ).toBe(true);
    const over = categoryFieldsSchema.safeParse({ name: "a".repeat(41) });
    expect(over.error?.issues[0]?.message).toBe("name_too_long");
  });

  it("trims the name before counting it", () => {
    const result = categoryFieldsSchema.parse({
      name: `  ${"a".repeat(40)}  `,
    });
    expect(result.name).toBe("a".repeat(40));
  });
});

describe("createCategorySchema", () => {
  it.each(["expense", "income"])("accepts the kind %s", (kind) => {
    expect(createCategorySchema.safeParse({ ...valid, kind }).success).toBe(
      true,
    );
  });

  it.each(["", "Expense", "transfer"])("rejects the kind %j", (kind) => {
    const result = createCategorySchema.safeParse({ ...valid, kind });
    expect(result.error?.issues[0]?.message).toBe("invalid_kind");
  });
});

describe("isCategoryKind", () => {
  it("knows the two kinds and nothing else", () => {
    expect(isCategoryKind("expense")).toBe(true);
    expect(isCategoryKind("income")).toBe(true);
    expect(isCategoryKind("transfer")).toBe(false);
  });
});

describe("fieldErrorsFrom", () => {
  it("maps each failing field to its error key", () => {
    const result = createCategorySchema.safeParse({ name: "", kind: "x" });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      name: "name_required",
      kind: "invalid_kind",
    });
  });

  it("falls back to unknown for a message that is not a key", () => {
    const result = createCategorySchema.safeParse({ ...valid, name: 42 });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      name: "unknown",
    });
  });
});
