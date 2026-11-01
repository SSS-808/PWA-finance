import { describe, expect, it } from "vitest";
import {
  MAX_NAME_LENGTH,
  categoryFieldsSchema,
  createCategorySchema,
  fieldErrorsFrom,
  isCategoryColor,
  isCategoryIcon,
  isCategoryKind,
  reorderCategoriesSchema,
} from "./schemas";

const valid = {
  name: "Coffee",
  kind: "expense",
  icon: "coffee",
  color: "amber",
};

describe("categoryFieldsSchema", () => {
  it("accepts a name and trims it", () => {
    expect(
      categoryFieldsSchema.parse({ ...valid, name: "  Coffee  " }),
    ).toMatchObject({ name: "Coffee" });
  });

  it.each(["", "   "])("requires a name, not %j", (name) => {
    const result = categoryFieldsSchema.safeParse({ ...valid, name });
    expect(result.error?.issues[0]?.message).toBe("name_required");
  });

  it("limits the name to 40 characters", () => {
    expect(MAX_NAME_LENGTH).toBe(40);
    expect(
      categoryFieldsSchema.safeParse({ ...valid, name: "a".repeat(40) })
        .success,
    ).toBe(true);
    const over = categoryFieldsSchema.safeParse({
      ...valid,
      name: "a".repeat(41),
    });
    expect(over.error?.issues[0]?.message).toBe("name_too_long");
  });

  it("trims the name before counting it", () => {
    const result = categoryFieldsSchema.parse({
      ...valid,
      name: `  ${"a".repeat(40)}  `,
    });
    expect(result.name).toBe("a".repeat(40));
  });
});

describe("categoryFieldsSchema icon and colour", () => {
  it("accepts a known icon and colour", () => {
    const result = categoryFieldsSchema.parse(valid);
    expect(result.icon).toBe("coffee");
    expect(result.color).toBe("amber");
  });

  it.each(["", "Coffee", "star"])("rejects the icon %j", (icon) => {
    const result = categoryFieldsSchema.safeParse({ ...valid, icon });
    expect(result.error?.issues[0]?.message).toBe("invalid_icon");
  });

  it.each(["", "Amber", "purple"])("rejects the colour %j", (color) => {
    const result = categoryFieldsSchema.safeParse({ ...valid, color });
    expect(result.error?.issues[0]?.message).toBe("invalid_color");
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

describe("reorderCategoriesSchema", () => {
  const idA = "3f2b8c1e-9a4d-4e6b-8c1a-2d7e5f9a0b11";
  const idB = "7c1d4a9e-2b6f-4d3a-9e8c-5a0b1c2d3e4f";

  it("accepts a valid list and an empty list", () => {
    expect(
      reorderCategoriesSchema.safeParse({ kind: "expense", ids: [idA, idB] })
        .success,
    ).toBe(true);
    expect(
      reorderCategoriesSchema.safeParse({ kind: "income", ids: [] }).success,
    ).toBe(true);
  });

  it("refuses an unknown kind", () => {
    expect(
      reorderCategoriesSchema.safeParse({ kind: "transfer", ids: [idA] })
        .success,
    ).toBe(false);
  });

  it("refuses an id that is not a uuid", () => {
    expect(
      reorderCategoriesSchema.safeParse({ kind: "expense", ids: ["nope"] })
        .success,
    ).toBe(false);
  });

  it("refuses a repeated id", () => {
    expect(
      reorderCategoriesSchema.safeParse({ kind: "expense", ids: [idA, idA] })
        .success,
    ).toBe(false);
  });

  it("refuses more than 200 ids", () => {
    const ids = Array.from(
      { length: 201 },
      (_, index) =>
        `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    expect(
      reorderCategoriesSchema.safeParse({ kind: "expense", ids }).success,
    ).toBe(false);
    expect(
      reorderCategoriesSchema.safeParse({
        kind: "expense",
        ids: ids.slice(0, 200),
      }).success,
    ).toBe(true);
  });
});

describe("isCategoryKind", () => {
  it("knows the two kinds and nothing else", () => {
    expect(isCategoryKind("expense")).toBe(true);
    expect(isCategoryKind("income")).toBe(true);
    expect(isCategoryKind("transfer")).toBe(false);
  });
});

describe("isCategoryIcon and isCategoryColor", () => {
  it("know their lists and nothing else", () => {
    expect(isCategoryIcon("paw-print")).toBe(true);
    expect(isCategoryIcon("star")).toBe(false);
    expect(isCategoryColor("indigo")).toBe(true);
    expect(isCategoryColor("purple")).toBe(false);
  });
});

describe("fieldErrorsFrom", () => {
  it("maps each failing field to its error key", () => {
    const result = createCategorySchema.safeParse({
      name: "",
      kind: "x",
      icon: "x",
      color: "x",
    });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      name: "name_required",
      kind: "invalid_kind",
      icon: "invalid_icon",
      color: "invalid_color",
    });
  });

  it("falls back to unknown for a message that is not a key", () => {
    const result = createCategorySchema.safeParse({ ...valid, name: 42 });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      name: "unknown",
    });
  });
});
