import { describe, expect, it } from "vitest";
import { formatDay } from "./format";

describe("formatDay", () => {
  it("leaves out the year in the current year", () => {
    expect(formatDay("2026-11-20", "2026-11-24")).toBe("20 Nov");
    expect(formatDay("2026-01-05", "2026-11-24")).toBe("5 Jan");
  });

  it("adds the year for another year", () => {
    expect(formatDay("2025-12-31", "2026-11-24")).toBe("31 Dec 2025");
  });
});
