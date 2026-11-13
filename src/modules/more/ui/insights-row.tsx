import { ChartColumn, ChevronRight } from "lucide-react";
import Link from "next/link";
import { en } from "@/messages/en";
import { type Money, formatMoney } from "@/modules/money";

// The full-width Insights row above the tiles; its status shows a normal month's spending once known
export function InsightsRow({ normalOut }: { normalOut: Money | null }) {
  return (
    <Link
      href="/insights"
      className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted"
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cat-teal-soft text-cat-teal"
      >
        <ChartColumn className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">
          {en.insights.title}
        </span>
        <span className="block text-sm break-words text-muted-foreground">
          {normalOut === null
            ? en.more.insightsNone
            : en.more.insightsNormal.replace(
                "{amount}",
                formatMoney(normalOut),
              )}
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}
