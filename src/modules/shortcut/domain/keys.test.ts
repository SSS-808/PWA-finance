import { describe, expect, it } from "vitest";
import { newKeySchema } from "./keys";

const accountId = "0b6f3a52-6f0e-4c8e-9d3a-2f1c5a7e8b90";

describe("newKeySchema", () => {
  it("trims the name", () => {
    const parsed = newKeySchema.parse({ name: "  iPhone  ", accountId });
    expect(parsed.name).toBe("iPhone");
  });

  it("refuses a blank name", () => {
    const parsed = newKeySchema.safeParse({ name: "   ", accountId });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("name_required");
  });

  it("accepts 40 characters and refuses 41", () => {
    expect(
      newKeySchema.safeParse({ name: "a".repeat(40), accountId }).success,
    ).toBe(true);
    const parsed = newKeySchema.safeParse({ name: "a".repeat(41), accountId });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("name_too_long");
  });

  it("refuses an account that is not a uuid", () => {
    const parsed = newKeySchema.safeParse({ name: "iPhone", accountId: "x" });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("account_required");
  });
});
