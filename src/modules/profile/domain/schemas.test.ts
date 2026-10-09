import { describe, expect, it } from "vitest";
import { MAX_NAME_LENGTH, fieldErrorsFrom, profileSchema } from "./schemas";

const valid = {
  displayName: "Sai",
  baseCurrency: "LAK",
  timeZone: "Asia/Vientiane",
};

describe("profileSchema", () => {
  it("accepts a valid profile", () => {
    expect(profileSchema.parse(valid)).toEqual(valid);
  });

  it("limits the name to 60 characters", () => {
    expect(MAX_NAME_LENGTH).toBe(60);
    const at = profileSchema.safeParse({
      ...valid,
      displayName: "a".repeat(60),
    });
    expect(at.success).toBe(true);
    const over = profileSchema.safeParse({
      ...valid,
      displayName: "a".repeat(61),
    });
    expect(over.error?.issues[0]?.message).toBe("name_too_long");
  });

  it("trims the name before counting it", () => {
    const result = profileSchema.parse({
      ...valid,
      displayName: `  ${"a".repeat(60)}  `,
    });
    expect(result.displayName).toBe("a".repeat(60));
  });

  it.each(["", "   "])("turns the name %j into null", (displayName) => {
    expect(
      profileSchema.parse({ ...valid, displayName }).displayName,
    ).toBeNull();
  });

  it.each(["LAK", "USD", "THB"])("accepts the currency %s", (baseCurrency) => {
    expect(profileSchema.safeParse({ ...valid, baseCurrency }).success).toBe(
      true,
    );
  });

  it.each(["EUR", "", "lak"])("rejects the currency %j", (baseCurrency) => {
    const result = profileSchema.safeParse({ ...valid, baseCurrency });
    expect(result.error?.issues[0]?.message).toBe("invalid_currency");
  });

  it.each(["Mars/Base", "", "not a zone"])(
    "rejects the time zone %j",
    (timeZone) => {
      const result = profileSchema.safeParse({ ...valid, timeZone });
      expect(result.error?.issues[0]?.message).toBe("invalid_time_zone");
    },
  );

  it("rejects a missing time zone", () => {
    const result = profileSchema.safeParse({ ...valid, timeZone: undefined });
    expect(result.error?.issues[0]?.message).toBe("invalid_time_zone");
  });
});

describe("fieldErrorsFrom", () => {
  it("maps each failing field to its error key", () => {
    const result = profileSchema.safeParse({
      displayName: "a".repeat(61),
      baseCurrency: "EUR",
      timeZone: "Mars/Base",
    });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      displayName: "name_too_long",
      baseCurrency: "invalid_currency",
      timeZone: "invalid_time_zone",
    });
  });

  it("falls back to unknown for a message that is not a key", () => {
    const result = profileSchema.safeParse({ ...valid, displayName: 42 });
    expect(result.error && fieldErrorsFrom(result.error)).toEqual({
      displayName: "unknown",
    });
  });
});
