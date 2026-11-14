import { describe, expect, it } from "vitest";
import { todayIn } from "./dates";

describe("todayIn", () => {
  const now = new Date("2026-10-31T17:30:00Z");

  it("uses the date in the given zone, which can be ahead of UTC", () => {
    expect(todayIn("Asia/Vientiane", now)).toBe("2026-11-01");
  });

  it("uses the UTC date for UTC", () => {
    expect(todayIn("UTC", now)).toBe("2026-10-31");
  });

  it("defaults to the current moment", () => {
    expect(todayIn("UTC")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
