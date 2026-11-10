import type { Trip } from "./types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parts(date: string) {
  return {
    year: date.slice(0, 4),
    month: MONTHS[Number(date.slice(5, 7)) - 1],
    day: String(Number(date.slice(8, 10))),
  };
}

// "10–17 Dec 2026", "28 Dec – 3 Jan 2027" or "10 Dec 2026"; plain calendar dates, so no time zone shift
export function formatTripDays(
  trip: Pick<Trip, "startsOn" | "endsOn">,
): string {
  const a = parts(trip.startsOn);
  const b = parts(trip.endsOn);
  if (trip.startsOn === trip.endsOn) return `${a.day} ${a.month} ${a.year}`;
  if (a.year === b.year && a.month === b.month) {
    return `${a.day}–${b.day} ${b.month} ${b.year}`;
  }
  if (a.year === b.year) {
    return `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`;
  }
  return `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`;
}
