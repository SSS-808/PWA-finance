import Link from "next/link";
import {
  CategoryIcon,
  categoryBarClass,
} from "@/components/shared/category-icon";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import type { CategorySpending } from "@/modules/dashboard";
import { type Money, formatMoney } from "@/modules/money";

const rowClass = "flex min-h-12 items-center gap-3 rounded-lg px-3 py-2";

function SpendingRow({
  item,
  href,
}: {
  item: CategorySpending;
  href: string | null;
}) {
  const content = (
    <>
      <CategoryIcon icon={item.icon} color={item.color} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-base break-words">
            {item.categoryId === null ? en.dashboard.other : item.name}
          </span>
          <span className="shrink-0 text-right text-base tabular-nums">
            {formatMoney(item.amount)}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="mt-2 block h-2 overflow-hidden rounded-full bg-muted"
        >
          <span
            className={cn(
              "block h-full rounded-full",
              categoryBarClass(item.color),
            )}
            style={{ width: `${item.share * 100}%` }}
          />
        </span>
      </span>
    </>
  );
  return (
    <li>
      {href === null ? (
        <div className={rowClass}>{content}</div>
      ) : (
        <Link href={href} className={`${rowClass} hover:bg-muted`}>
          {content}
        </Link>
      )}
    </li>
  );
}

// Where one currency's spending on the trip went, largest first; each category opens History for this trip
export function TripSpending({
  tripId,
  spending,
  items,
}: {
  tripId: string;
  spending: Money;
  items: readonly CategorySpending[];
}) {
  const { currency } = spending;
  return (
    <section
      aria-labelledby={`trip-spending-${currency} trip-spending-${currency}-currency`}
      className="space-y-2 rounded-2xl border border-border bg-card px-1 py-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-3">
        <h2 id={`trip-spending-${currency}`} className="text-lg font-semibold">
          {en.trips.detail.whereMoneyWent}
        </h2>
        <p
          id={`trip-spending-${currency}-currency`}
          className="text-sm text-muted-foreground"
        >
          {en.currencies[currency]}
        </p>
      </div>
      <ul>
        {items.map((item) => (
          <SpendingRow
            key={item.categoryId ?? "other"}
            item={item}
            // "Other" mixes several categories, so it has nothing to open
            href={
              item.categoryId === null
                ? null
                : `/transactions?trip=${tripId}&month=all&category=${item.categoryId}&type=expense`
            }
          />
        ))}
      </ul>
    </section>
  );
}
