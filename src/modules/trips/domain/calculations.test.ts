import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import { groupTrips, spentByTrip, tripDay, tripStatus } from "./calculations";

const trip = { startsOn: "2026-12-10", endsOn: "2026-12-17" };

describe("tripStatus", () => {
  it("is upcoming before the first day", () => {
    expect(tripStatus(trip, "2026-12-09")).toBe("upcoming");
  });

  it("is now on the first and the last day", () => {
    expect(tripStatus(trip, "2026-12-10")).toBe("now");
    expect(tripStatus(trip, "2026-12-13")).toBe("now");
    expect(tripStatus(trip, "2026-12-17")).toBe("now");
  });

  it("is past after the last day", () => {
    expect(tripStatus(trip, "2026-12-18")).toBe("past");
  });
});

describe("tripDay", () => {
  it("counts the first day as day 1 and both ends in the length", () => {
    expect(tripDay(trip, "2026-12-10")).toEqual({ day: 1, days: 8 });
    expect(tripDay(trip, "2026-12-12")).toEqual({ day: 3, days: 8 });
    expect(tripDay(trip, "2026-12-17")).toEqual({ day: 8, days: 8 });
  });

  it("is one day long for a one-day trip", () => {
    expect(
      tripDay({ startsOn: "2027-03-01", endsOn: "2027-03-01" }, "2027-03-01"),
    ).toEqual({ day: 1, days: 1 });
  });

  it("counts across a month and a year end", () => {
    expect(
      tripDay({ startsOn: "2026-12-30", endsOn: "2027-01-02" }, "2027-01-01"),
    ).toEqual({ day: 3, days: 4 });
  });
});

describe("groupTrips", () => {
  const trips = [
    { id: "a", startsOn: "2026-01-01", endsOn: "2026-01-05" },
    { id: "b", startsOn: "2026-03-01", endsOn: "2026-03-05" },
    { id: "c", startsOn: "2026-12-01", endsOn: "2026-12-20" },
    { id: "d", startsOn: "2027-05-01", endsOn: "2027-05-05" },
    { id: "e", startsOn: "2027-02-01", endsOn: "2027-02-05" },
  ];

  it("splits by status, soonest upcoming first and latest past first", () => {
    const groups = groupTrips(trips, "2026-12-10");
    expect(groups.now.map((t) => t.id)).toEqual(["c"]);
    expect(groups.upcoming.map((t) => t.id)).toEqual(["e", "d"]);
    expect(groups.past.map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("returns empty groups for no trips", () => {
    expect(groupTrips([], "2026-12-10")).toEqual({
      now: [],
      upcoming: [],
      past: [],
    });
  });
});

describe("spentByTrip", () => {
  it("is empty without rows", () => {
    expect(spentByTrip([]).size).toBe(0);
  });

  it("adds each currency per trip, as positive amounts in currency order", () => {
    const result = spentByTrip([
      { tripId: "x", amount: money(-100, "USD") },
      { tripId: "x", amount: money(-25000, "LAK") },
      { tripId: "y", amount: money(-500, "USD") },
      { tripId: "x", amount: money(-50, "USD") },
    ]);
    expect(result.get("x")).toEqual([money(25000, "LAK"), money(150, "USD")]);
    expect(result.get("y")).toEqual([money(500, "USD")]);
    expect(result.get("z")).toBeUndefined();
  });
});
