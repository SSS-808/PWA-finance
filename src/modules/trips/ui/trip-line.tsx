import { ChevronRight, Plane } from "lucide-react";
import Link from "next/link";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { tripDay } from "../domain/calculations";
import type { CurrentTrip } from "../server/queries";

// Home's slim line for the trip that is on: name, day and what was spent so far
export function TripLine({
  current,
  today,
}: {
  current: CurrentTrip;
  today: string;
}) {
  const { trip, spent } = current;
  const { day, days } = tripDay(trip, today);
  const dayText = en.trips.dayOf
    .replace("{day}", String(day))
    .replace("{days}", String(days));
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cat-indigo-soft text-cat-indigo"
      >
        <Plane className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold break-words">
          {trip.name} · {dayText}
        </span>
        <span className="block text-sm break-words text-muted-foreground tabular-nums">
          {spent.length > 0
            ? en.trips.spentSoFar.replace(
                "{amounts}",
                spent.map((amount) => formatMoney(amount)).join(" · "),
              )
            : en.trips.nothingSpent}
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}
