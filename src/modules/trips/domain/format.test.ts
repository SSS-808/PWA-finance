import { describe, expect, it } from "vitest";
import { formatTripDays } from "./format";

describe("formatTripDays", () => {
  it("joins days of one month", () => {
    expect(
      formatTripDays({ startsOn: "2026-12-10", endsOn: "2026-12-17" }),
    ).toBe("10–17 Dec 2026");
  });

  it("names both months within a year", () => {
    expect(
      formatTripDays({ startsOn: "2026-11-28", endsOn: "2026-12-03" }),
    ).toBe("28 Nov – 3 Dec 2026");
  });

  it("names both years across a year end", () => {
    expect(
      formatTripDays({ startsOn: "2026-12-28", endsOn: "2027-01-03" }),
    ).toBe("28 Dec 2026 – 3 Jan 2027");
  });

  it("shows one day once", () => {
    expect(
      formatTripDays({ startsOn: "2026-12-05", endsOn: "2026-12-05" }),
    ).toBe("5 Dec 2026");
  });
});
