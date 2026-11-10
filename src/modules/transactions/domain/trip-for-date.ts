import type { TripOption } from "./types";

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

// The trip whose days include this date (both ends count), or null
export function tripForDate(
  trips: readonly TripOption[],
  date: string,
): TripOption | null {
  return (
    trips.find((trip) => trip.startsOn <= date && date <= trip.endsOn) ?? null
  );
}

// "12 Dec" from YYYY-MM-DD; plain calendar text, so no time zone shift
export function shortDate(date: string): string {
  const month = MONTHS.slice(Number(date.slice(5, 7)) - 1)[0];
  return `${Number(date.slice(8, 10))} ${month}`;
}
