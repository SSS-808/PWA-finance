"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Popover } from "radix-ui";
import { en } from "@/messages/en";
import { PERIODS, type Period } from "../domain/types";

// The pill that picks the last 3, 6 or 12 months; each option is a link that keeps the currency
export function PeriodMenu({
  period,
  currency,
}: {
  period: Period;
  currency: string | null;
}) {
  const text = en.insights;
  const label = (n: number) => text.periodOption.replace("{n}", String(n));
  const href = (n: number) =>
    currency === null
      ? `/insights?period=${n}`
      : `/insights?period=${n}&currency=${currency}`;
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={text.periodCurrent.replace("{n}", String(period))}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {label(period)}
        <ChevronDown aria-hidden="true" className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={4}
          collisionPadding={16}
          aria-label={text.periodLabel}
          className="z-50 min-w-40 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {PERIODS.map((n) => (
            <Popover.Close key={n} asChild>
              <Link
                href={href(n)}
                aria-current={n === period ? "page" : undefined}
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-base hover:bg-muted"
              >
                {label(n)}
                {n === period ? (
                  <Check aria-hidden="true" className="size-4 text-primary" />
                ) : null}
              </Link>
            </Popover.Close>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
