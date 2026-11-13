"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  categoryBarClass,
  categoryStrokeClass,
} from "@/components/shared/category-icon";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { type Money, formatMoney } from "@/modules/money";
import { monthName, monthYear, pieSlices } from "../domain/chart";

type PieItem = {
  categoryId: string | null;
  name: string;
  color: string;
  amount: Money;
  share: number;
};

type PieMonth = { month: string; spending: Money; byCategory: PieItem[] };

const arrowClass =
  "inline-flex size-11 items-center justify-center rounded-full hover:bg-muted";

function itemName(item: PieItem): string {
  return item.categoryId === null ? en.insights.rest : item.name;
}

// A donut of one month's money out with arrows to change month, and the slices listed below
export function CategoryPie({
  pies,
  currentMonth,
  initialMonth,
}: {
  pies: readonly PieMonth[];
  currentMonth: string;
  initialMonth: string;
}) {
  const text = en.insights;
  const start = Math.max(
    0,
    pies.findIndex((pie) => pie.month === initialMonth),
  );
  const [index, setIndex] = useState(start);
  const pie = pies[index];
  if (pie === undefined) return null;
  const slices = pieSlices(pie.byCategory.map((item) => item.share));
  const isCurrent = pie.month === currentMonth;
  const label = `${text.pieLabel}: ${pie.byCategory
    .map((item) => `${itemName(item)} ${Math.round(item.share * 100)}%`)
    .join(", ")}`;
  const outIn = (isCurrent ? text.outInSoFar : text.outIn).replace(
    "{month}",
    monthName(pie.month),
  );
  return (
    <div className="space-y-4">
      <div className="flex min-h-13 items-center justify-between rounded-full border border-border bg-background p-1">
        {index > 0 ? (
          <button
            type="button"
            aria-label={en.transactions.filters.previousMonth}
            onClick={() => setIndex(index - 1)}
            className={arrowClass}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
        ) : (
          <span className="size-11" aria-hidden="true" />
        )}
        <span aria-live="polite" className="text-base font-semibold">
          {monthYear(pie.month)}
        </span>
        {index < pies.length - 1 ? (
          <button
            type="button"
            aria-label={en.transactions.filters.nextMonth}
            onClick={() => setIndex(index + 1)}
            className={arrowClass}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        ) : (
          <span className="size-11" aria-hidden="true" />
        )}
      </div>
      {pie.byCategory.length === 0 ? (
        <p className="text-base text-muted-foreground">
          {text.noSpending.replace("{month}", monthYear(pie.month))}
        </p>
      ) : (
        <>
          <div className="relative mx-auto size-48">
            <svg
              viewBox="0 0 42 42"
              role="img"
              aria-label={label}
              className="size-full"
            >
              {pie.byCategory.map((item, position) => {
                const slice = slices[position];
                if (slice === undefined) return null;
                return (
                  <circle
                    key={item.categoryId ?? "other"}
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="none"
                    strokeWidth="7"
                    className={categoryStrokeClass(item.color)}
                    strokeDasharray={`${slice.length} ${100 - slice.length}`}
                    strokeDashoffset={slice.offset}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-9 text-center">
              <span className="text-base leading-tight font-semibold break-words">
                {formatMoney(pie.spending)}
              </span>
              <span className="text-xs text-muted-foreground">{outIn}</span>
            </div>
          </div>
          <ul>
            {pie.byCategory.map((item) => (
              <li
                key={item.categoryId ?? "other"}
                className="flex min-h-11 items-center gap-3"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-3 shrink-0 rounded-sm",
                    categoryBarClass(item.color),
                  )}
                />
                <span className="min-w-0 flex-1 text-base break-words">
                  {itemName(item)}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                  {Math.round(item.share * 100)}%
                </span>
                <span className="shrink-0 text-right text-base tabular-nums">
                  {formatMoney(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
