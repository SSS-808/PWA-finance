import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { en } from "@/messages/en";
import { monthLabel, nextMonth, previousMonth } from "@/modules/transactions";

const arrowClass =
  "inline-flex size-12 items-center justify-center rounded-lg hover:bg-muted";

// The month switcher of Home; it changes ?month= and never goes past the current month
export function DashboardMonthBar({
  month,
  currentMonth,
}: {
  month: string;
  currentMonth: string;
}) {
  const text = en.transactions.filters;
  return (
    <nav
      aria-label={text.monthLabel}
      className="flex flex-wrap items-center gap-x-1"
    >
      <Link
        href={`/?month=${previousMonth(month)}`}
        aria-label={text.previousMonth}
        className={arrowClass}
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </Link>
      <span className="min-w-36 text-center text-base font-medium">
        {monthLabel(month)}
      </span>
      {nextMonth(month) <= currentMonth ? (
        <Link
          href={`/?month=${nextMonth(month)}`}
          aria-label={text.nextMonth}
          className={arrowClass}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      ) : (
        <span className="size-12" aria-hidden="true" />
      )}
    </nav>
  );
}
