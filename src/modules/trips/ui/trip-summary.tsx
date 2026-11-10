import { en } from "@/messages/en";
import { type Money, formatMoney, isZero } from "@/modules/money";
import { tripDay, tripStatus } from "../domain/calculations";
import { formatTripDays } from "../domain/format";
import type { Trip } from "../domain/types";

// One total per currency, never added together
type Totals = { spending: Money; income: Money };

function AmountLines({ label, amounts }: { label: string; amounts: Money[] }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium tracking-wider text-hero-muted uppercase">
        {label}
      </dt>
      {amounts.map((amount) => (
        <dd
          key={amount.currency}
          className="text-xl font-semibold break-words tabular-nums"
        >
          {formatMoney(amount)}
        </dd>
      ))}
    </div>
  );
}

// The emerald card of a trip: its days, name, what was spent and what came in, and how many entries it holds
export function TripSummary({
  trip,
  totals,
  entries,
  today,
}: {
  trip: Trip;
  totals: readonly Totals[];
  entries: number;
  today: string;
}) {
  const { day, days } = tripDay(trip, today);
  const spent = totals.map((total) => total.spending).filter((a) => !isZero(a));
  const income = totals.map((total) => total.income).filter((a) => !isZero(a));
  const dayText =
    tripStatus(trip, today) === "now"
      ? ` · ${en.trips.dayOf.replace("{day}", String(day)).replace("{days}", String(days))}`
      : "";
  return (
    <section
      aria-labelledby="trip-name"
      className="space-y-4 rounded-2xl bg-hero p-5 text-hero-foreground"
    >
      <div className="space-y-1">
        <p className="text-sm text-hero-muted">
          {formatTripDays(trip)}
          {dayText}
        </p>
        <h1
          id="trip-name"
          className="text-2xl font-semibold tracking-tight break-words"
        >
          {trip.name}
        </h1>
      </div>
      <dl className="space-y-3">
        {spent.length > 0 ? (
          <AmountLines label={en.trips.detail.spent} amounts={spent} />
        ) : (
          <div className="space-y-0.5">
            <dt className="text-xs font-medium tracking-wider text-hero-muted uppercase">
              {en.trips.detail.spent}
            </dt>
            <dd className="text-base">{en.trips.detail.nothingSpent}</dd>
          </div>
        )}
        {income.length > 0 ? (
          <AmountLines label={en.trips.detail.moneyIn} amounts={income} />
        ) : null}
      </dl>
      <p className="border-t border-hero-border pt-3 text-sm text-hero-muted">
        {entries === 1
          ? en.trips.detail.entriesOne
          : en.trips.detail.entries.replace("{n}", String(entries))}
      </p>
    </section>
  );
}
