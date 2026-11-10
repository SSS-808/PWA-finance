import Link from "next/link";
import { AddLink } from "@/components/shared/add-link";
import { en } from "@/messages/en";
import { type Money, formatMoney } from "@/modules/money";
import { groupTrips, tripDay } from "../domain/calculations";
import { formatTripDays } from "../domain/format";
import type { Trip } from "../domain/types";

function TripCard({
  trip,
  spent,
  today,
  isNow,
}: {
  trip: Trip;
  spent: readonly Money[];
  today: string;
  isNow: boolean;
}) {
  const { day, days } = tripDay(trip, today);
  const range = formatTripDays(trip);
  const spentText =
    spent.length > 0
      ? spent.map((amount) => formatMoney(amount)).join(" · ")
      : null;
  return (
    <li>
      <Link
        href={`/trips/${trip.id}`}
        className="block space-y-1 rounded-2xl border border-border bg-card p-4 hover:bg-muted"
      >
        <span className="block text-base font-semibold break-words">
          {trip.name}
        </span>
        <span className="block text-sm text-muted-foreground">
          {range}
          {isNow
            ? ` · ${en.trips.dayOf.replace("{day}", String(day)).replace("{days}", String(days))}`
            : null}
        </span>
        {spentText ? (
          <span className="block text-base tabular-nums">{spentText}</span>
        ) : (
          <span className="block text-sm text-muted-foreground">
            {en.trips.nothingSpent}
          </span>
        )}
      </Link>
    </li>
  );
}

// Trips in On now, Coming up and Past; an empty section is left out
export function TripList({
  trips,
  spent,
  today,
}: {
  trips: readonly Trip[];
  spent: Readonly<Record<string, readonly Money[]>>;
  today: string;
}) {
  if (trips.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card px-5 py-6">
        <div className="space-y-1">
          <p className="text-xl font-semibold">{en.trips.empty}</p>
          <p className="text-base text-muted-foreground">
            {en.trips.emptyHint}
          </p>
        </div>
        <div className="flex">
          <AddLink href="/trips/new" label={en.trips.add} />
        </div>
      </div>
    );
  }

  const groups = groupTrips(trips, today);
  const sections = [
    { key: "now", trips: groups.now },
    { key: "upcoming", trips: groups.upcoming },
    { key: "past", trips: groups.past },
  ] as const;
  return (
    <div className="space-y-8">
      {sections.map((section) =>
        section.trips.length === 0 ? null : (
          <section
            key={section.key}
            aria-labelledby={`trips-${section.key}`}
            className="space-y-3"
          >
            <h2 id={`trips-${section.key}`} className="text-xl font-semibold">
              {en.trips.sections[section.key]}
            </h2>
            <ul className="space-y-3">
              {section.trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  spent={spent[trip.id] ?? []}
                  today={today}
                  isNow={section.key === "now"}
                />
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
