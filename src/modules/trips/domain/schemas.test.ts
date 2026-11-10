import { describe, expect, it } from "vitest";
import { fieldErrorsFrom, isValidTripDate, tripSchema } from "./schemas";

const valid = { name: "Vietnam", startsOn: "2026-12-10", endsOn: "2026-12-17" };

describe("isValidTripDate", () => {
  it("accepts real dates inside the range", () => {
    expect(isValidTripDate("2026-12-10")).toBe(true);
    expect(isValidTripDate("2000-01-01")).toBe(true);
    expect(isValidTripDate("2100-12-31")).toBe(true);
  });

  it("rejects wrong shapes, impossible days and out-of-range years", () => {
    expect(isValidTripDate("")).toBe(false);
    expect(isValidTripDate("10/12/2026")).toBe(false);
    expect(isValidTripDate("2026-02-30")).toBe(false);
    expect(isValidTripDate("1999-12-31")).toBe(false);
    expect(isValidTripDate("2101-01-01")).toBe(false);
    expect(isValidTripDate("2026-13-01")).toBe(false);
  });
});

describe("tripSchema", () => {
  it("accepts a trip and trims the name", () => {
    expect(tripSchema.parse({ ...valid, name: "  Vietnam " })).toEqual(valid);
  });

  it("accepts a one-day trip", () => {
    expect(
      tripSchema.safeParse({ ...valid, endsOn: valid.startsOn }).success,
    ).toBe(true);
  });

  it("needs a name of 1 to 60 characters", () => {
    expect(
      fieldErrorsFrom(tripSchema.safeParse({ ...valid, name: "  " }).error!),
    ).toEqual({
      name: "name_required",
    });
    expect(
      tripSchema.safeParse({ ...valid, name: "a".repeat(60) }).success,
    ).toBe(true);
    expect(
      fieldErrorsFrom(
        tripSchema.safeParse({ ...valid, name: "a".repeat(61) }).error!,
      ),
    ).toEqual({ name: "name_too_long" });
  });

  it("flags each bad date", () => {
    const result = tripSchema.safeParse({
      ...valid,
      startsOn: "",
      endsOn: "nope",
    });
    expect(fieldErrorsFrom(result.error!)).toEqual({
      startsOn: "date_invalid",
      endsOn: "date_invalid",
    });
  });

  it("refuses a last day before the first", () => {
    const result = tripSchema.safeParse({ ...valid, endsOn: "2026-12-09" });
    expect(fieldErrorsFrom(result.error!)).toEqual({
      endsOn: "dates_out_of_order",
    });
  });
});

describe("fieldErrorsFrom", () => {
  it("falls back to unknown for a message that is not a key", () => {
    const result = tripSchema.safeParse({
      name: 5,
      startsOn: valid.startsOn,
      endsOn: valid.endsOn,
    });
    expect(fieldErrorsFrom(result.error!)).toEqual({ name: "unknown" });
  });
});
