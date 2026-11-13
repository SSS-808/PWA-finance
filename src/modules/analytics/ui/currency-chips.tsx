import Link from "next/link";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { type CurrencyCode, currencySymbol } from "@/modules/money";

// One chip per currency in use; the current one is marked and the period is kept
export function CurrencyChips({
  currencies,
  current,
  period,
}: {
  currencies: readonly CurrencyCode[];
  current: CurrencyCode;
  period: number;
}) {
  return (
    <div
      role="group"
      aria-label={en.insights.currencyLabel}
      className="flex flex-wrap gap-2"
    >
      {currencies.map((code) => (
        <Link
          key={code}
          href={`/insights?currency=${code}&period=${period}`}
          aria-label={en.currencies[code]}
          aria-current={code === current ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-full border px-4 text-base font-medium",
            code === current
              ? "border-primary bg-primary-soft text-primary"
              : "border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          {currencySymbol(code)} {code}
        </Link>
      ))}
    </div>
  );
}
