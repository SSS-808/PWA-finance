import { describe, expect, it } from "vitest";
import { isValidTimeZone, timeZoneOptions } from "./time-zones";

describe("isValidTimeZone", () => {
  it.each(["Asia/Vientiane", "Asia/Bangkok", "UTC"])("accepts %j", (value) => {
    expect(isValidTimeZone(value)).toBe(true);
  });

  it.each(["", "Mars/Base", "not a zone", "asia/bangkok", "+05:00"])(
    "rejects %j",
    (value) => {
      expect(isValidTimeZone(value)).toBe(false);
    },
  );
});

describe("timeZoneOptions", () => {
  it("contains Asia/Vientiane", () => {
    expect(timeZoneOptions("Asia/Vientiane")).toContain("Asia/Vientiane");
  });

  it("does not repeat a saved zone the browser already lists", () => {
    const zones = timeZoneOptions("Asia/Vientiane");
    expect(zones.filter((zone) => zone === "Asia/Vientiane")).toHaveLength(1);
  });

  it("adds a valid saved zone that the list is missing", () => {
    expect(Intl.supportedValuesOf("timeZone")).not.toContain("UTC");
    expect(timeZoneOptions("UTC")).toContain("UTC");
  });

  it("ignores a saved zone that is not valid", () => {
    expect(timeZoneOptions("Mars/Base")).not.toContain("Mars/Base");
  });

  it("is sorted", () => {
    const zones = timeZoneOptions("UTC");
    expect(zones).toEqual([...zones].sort());
  });
});
