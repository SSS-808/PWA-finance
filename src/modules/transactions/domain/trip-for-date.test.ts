import { describe, expect, it } from "vitest";
import { shortDate, tripForDate } from "./trip-for-date";
import type { TripOption } from "./types";

const vietnam: TripOption = {
  id: "a",
  label: "Vietnam · 10–17 Dec 2026",
  startsOn: "2026-12-10",
  endsOn: "2026-12-17",
};
const laos: TripOption = {
  id: "b",
  label: "Laos · 20–22 Dec 2026",
  startsOn: "2026-12-20",
  endsOn: "2026-12-22",
};

describe("tripForDate", () => {
  it("finds the trip that holds the date, ends included", () => {
    expect(tripForDate([vietnam, laos], "2026-12-10")).toBe(vietnam);
    expect(tripForDate([vietnam, laos], "2026-12-13")).toBe(vietnam);
    expect(tripForDate([vietnam, laos], "2026-12-17")).toBe(vietnam);
    expect(tripForDate([vietnam, laos], "2026-12-21")).toBe(laos);
  });

  it("gives null outside every trip or without trips", () => {
    expect(tripForDate([vietnam, laos], "2026-12-09")).toBeNull();
    expect(tripForDate([vietnam, laos], "2026-12-18")).toBeNull();
    expect(tripForDate([], "2026-12-13")).toBeNull();
  });
});

describe("shortDate", () => {
  it("writes the day and the month name", () => {
    expect(shortDate("2026-12-02")).toBe("2 Dec");
    expect(shortDate("2027-01-31")).toBe("31 Jan");
  });
});
