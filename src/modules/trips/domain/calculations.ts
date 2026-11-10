import { CURRENCY_CODES, type Money, negate, sum } from "@/modules/money";
import type { Trip } from "./types";

export type TripStatus = "now" | "upcoming" | "past";

// An expense row of a trip, amount as stored (negative)
export type TripSpendRow = { tripId: string; amount: Money };

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

// Today inside the days, first and last day included, is "now"; dates are YYYY-MM-DD
export function tripStatus(
  trip: Pick<Trip, "startsOn" | "endsOn">,
  today: string,
): TripStatus {
  if (today < trip.startsOn) return "upcoming";
  if (today > trip.endsOn) return "past";
  return "now";
}

// Day 1 is the first day; days counts both ends
export function tripDay(
  trip: Pick<Trip, "startsOn" | "endsOn">,
  today: string,
): { day: number; days: number } {
  return {
    day: daysBetween(trip.startsOn, today) + 1,
    days: daysBetween(trip.startsOn, trip.endsOn) + 1,
  };
}

// Upcoming trips come soonest first, past trips latest first
export function groupTrips<T extends Pick<Trip, "startsOn" | "endsOn">>(
  trips: readonly T[],
  today: string,
): { now: T[]; upcoming: T[]; past: T[] } {
  const of = (status: TripStatus) =>
    trips.filter((trip) => tripStatus(trip, today) === status);
  return {
    now: of("now"),
    upcoming: of("upcoming").sort((a, b) =>
      a.startsOn.localeCompare(b.startsOn),
    ),
    past: of("past").sort((a, b) => b.startsOn.localeCompare(a.startsOn)),
  };
}

// What each trip spent, one positive amount per currency in CURRENCY_CODES order; trips without rows are left out
export function spentByTrip(
  rows: readonly TripSpendRow[],
): Map<string, Money[]> {
  const result = new Map<string, Money[]>();
  const tripIds = new Set(rows.map((row) => row.tripId));
  for (const tripId of tripIds) {
    const own = rows.filter((row) => row.tripId === tripId);
    const amounts: Money[] = [];
    for (const currency of CURRENCY_CODES) {
      const inCurrency = own.filter((row) => row.amount.currency === currency);
      if (inCurrency.length === 0) continue;
      amounts.push(
        negate(
          sum(
            inCurrency.map((row) => row.amount),
            currency,
          ),
        ),
      );
    }
    result.set(tripId, amounts);
  }
  return result;
}
