import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { en } from "@/messages/en";
import { monthLabel, nextMonth, previousMonth } from "@/modules/transactions";

const arrowClass =
  "inline-flex size-11 items-center justify-center rounded-full hover:bg-muted";

// The month switcher of Home and Budgets (basePath); it changes ?month= and never goes past the current month
export function DashboardMonthBar({
  month,
  currentMonth,
  basePath = "/",
}: {
  month: string;
  currentMonth: string;
  basePath?: string;
}) {
  const text = en.transactions.filters;
  return (
    <nav
      aria-label={text.monthLabel}
      className="flex min-h-13 items-center justify-between rounded-full border border-border bg-card p-1"
    >
      <Link
        href={`${basePath}?month=${previousMonth(month)}`}
        aria-label={text.previousMonth}
        className={arrowClass}
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </Link>
      <span className="text-center text-base font-semibold">
        {monthLabel(month)}
      </span>
      {nextMonth(month) <= currentMonth ? (
        <Link
          href={`${basePath}?month=${nextMonth(month)}`}
          aria-label={text.nextMonth}
          className={arrowClass}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      ) : (
        <span className="size-11" aria-hidden="true" />
      )}
    </nav>
  );
}
