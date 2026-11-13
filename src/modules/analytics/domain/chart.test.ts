import { describe, expect, it } from "vitest";
import {
  dayMonth,
  monthAfter,
  monthName,
  monthRangeLabel,
  monthShort,
  monthYear,
  pieSlices,
} from "./chart";

describe("pieSlices", () => {
  it("gives one slice the whole circle", () => {
    expect(pieSlices([1])).toEqual([{ length: 100, offset: 25 }]);
  });

  it("leaves a small gap and starts each slice where the last ended", () => {
    const slices = pieSlices([0.5, 0.25, 0.25]);
    expect(slices.map((slice) => slice.length)).toEqual([49.6, 24.6, 24.6]);
    expect(slices.map((slice) => slice.offset)).toEqual([25, 75, 50]);
  });

  it("wraps the offset past a full turn", () => {
    expect(pieSlices([0.1, 0.9])[1]?.offset).toBeCloseTo(15);
  });

  it("never gives a tiny slice a length below zero", () => {
    expect(pieSlices([0.998, 0.002])[1]?.length).toBe(0);
  });

  it("gives nothing for no slices", () => {
    expect(pieSlices([])).toEqual([]);
  });
});

describe("month text", () => {
  it("names a month", () => {
    expect(monthName("2026-11")).toBe("November");
    expect(monthShort("2026-11")).toBe("Nov");
    expect(monthYear("2026-11")).toBe("November 2026");
  });

  it("writes a range inside a year and across years", () => {
    expect(monthRangeLabel("2026-05", "2026-10")).toBe("May–Oct 2026");
    expect(monthRangeLabel("2026-10", "2026-10")).toBe("Oct 2026");
    expect(monthRangeLabel("2025-11", "2026-04")).toBe("Nov 2025–Apr 2026");
  });

  it("writes a day and month", () => {
    expect(dayMonth("2026-11-13")).toBe("13 Nov");
    expect(dayMonth("2026-09-05")).toBe("5 Sep");
  });

  it("moves months across a year end", () => {
    expect(monthAfter("2026-11", 2)).toBe("2027-01");
    expect(monthAfter("2026-11", 1)).toBe("2026-12");
  });
});
