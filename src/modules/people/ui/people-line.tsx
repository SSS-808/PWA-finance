import { ChevronRight, HandCoins } from "lucide-react";
import Link from "next/link";
import { en } from "@/messages/en";
import { type Money, formatMoney } from "@/modules/money";

const text = en.people.homeLine;

function amounts(list: readonly Money[]): string {
  return list.map((amount) => formatMoney(amount)).join(" · ");
}

// Home's glanceable line: what people owe you and what you owe, per currency; zeros are left out
export function PeopleLine({
  owed,
  owe,
}: {
  owed: readonly Money[];
  owe: readonly Money[];
}) {
  return (
    <Link
      href="/people"
      className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cat-amber-soft text-cat-amber"
      >
        <HandCoins className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-muted-foreground">
          {en.people.title}
        </span>
        <span className="flex flex-wrap gap-x-3 text-base font-semibold tabular-nums">
          {owed.length > 0 ? (
            <span className="text-primary">
              {text.owed.replace("{amounts}", amounts(owed))}
            </span>
          ) : null}
          {owe.length > 0 ? (
            <span className="text-expense">
              {text.owe.replace("{amounts}", amounts(owe))}
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
