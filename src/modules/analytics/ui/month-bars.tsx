"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { monthShort, monthYear } from "../domain/chart";
import type { MonthTotals } from "../domain/types";

// Two bars per month (money in, money out); the tapped month is spelled out below
export function MonthBars({
  bars,
  currentMonth,
  initialMonth,
}: {
  bars: readonly MonthTotals[];
  currentMonth: string;
  initialMonth: string;
}) {
  const text = en.insights;
  const [selected, setSelected] = useState(initialMonth);
  // Bar heights are a display ratio only
  const largest = Math.max(
    1,
    ...bars.flatMap((bar) => [bar.income.minor, bar.spending.minor]),
  );
  const chosen = bars.find((bar) => bar.month === selected) ?? bars.at(-1);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <ul className="flex">
          {bars.map((bar) => {
            const isCurrent = bar.month === currentMonth;
            const name = text.monthBar
              .replace("{month}", monthYear(bar.month))
              .replace("{in}", formatMoney(bar.income))
              .replace("{out}", formatMoney(bar.spending));
            return (
              <li
                key={bar.month}
                className="relative flex min-h-11 min-w-6 flex-1 flex-col items-center gap-1 p-1"
              >
                {/* The button covers the whole cell; its text sits beside it so the name stays the full one */}
                <button
                  type="button"
                  aria-pressed={bar.month === selected}
                  aria-label={isCurrent ? `${name} ${text.soFar}` : name}
                  onClick={() => setSelected(bar.month)}
                  className={cn(
                    "absolute inset-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    bar.month === selected && "bg-muted",
                  )}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none relative flex h-[100px] items-end gap-0.5",
                    isCurrent && "opacity-45",
                  )}
                >
                  <span
                    className="block w-2 rounded-t-sm bg-income"
                    style={{
                      height: `${(bar.income.minor / largest) * 100}%`,
                    }}
                  />
                  <span
                    className="block w-2 rounded-t-sm bg-expense"
                    style={{
                      height: `${(bar.spending.minor / largest) * 100}%`,
                    }}
                  />
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none relative text-center text-xs leading-tight whitespace-nowrap text-muted-foreground"
                >
                  {monthShort(bar.month)}
                  {isCurrent ? (
                    <>
                      <br />
                      {text.soFar}
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      {chosen ? (
        <div aria-live="polite" className="space-y-0.5">
          <p className="text-base font-semibold">
            {monthYear(chosen.month)}
            {chosen.month === currentMonth ? ` ${text.soFar}` : null}
          </p>
          <p className="flex flex-wrap gap-x-4 text-base tabular-nums">
            <span className="text-income">
              {text.moneyInShort} {formatMoney(chosen.income)}
            </span>
            <span className="text-expense">
              {text.moneyOutShort} {formatMoney(chosen.spending)}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
