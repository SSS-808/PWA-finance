import { Check, X } from "lucide-react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { monthShort } from "../domain/chart";
import type { BudgetMonthResult, BudgetRecord } from "../domain/types";

const WORDS: Record<BudgetMonthResult, string> = {
  kept: en.insights.wordKept,
  over: en.insights.wordOver,
  none: en.insights.wordNone,
};

function MonthCell({
  result,
  month,
}: {
  result: BudgetMonthResult;
  month: string;
}) {
  return (
    <li className="flex w-9 flex-col items-center gap-1 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[26px] items-center justify-center rounded-full",
          result === "kept" && "bg-primary-soft text-primary",
          result === "over" && "bg-expense-soft text-expense",
          result === "none" &&
            "size-6 border border-dashed border-muted-foreground",
        )}
      >
        {result === "kept" ? <Check className="size-4" /> : null}
        {result === "over" ? <X className="size-4" /> : null}
      </span>
      <span aria-hidden="true">{monthShort(month)}</span>
      <span className="sr-only">
        {monthShort(month)} {WORDS[result]}
      </span>
    </li>
  );
}

// How often each budget was kept, one circle per counted month
export function BudgetRecords({
  records,
  months,
}: {
  records: readonly BudgetRecord[];
  months: readonly string[];
}) {
  const text = en.insights;
  return (
    <ul className="space-y-4">
      {records.map((record) => {
        const first = record.months.findIndex((result) => result !== "none");
        const since = months[first];
        const budget = formatMoney(record.budget);
        return (
          <li key={record.categoryId} className="space-y-2">
            <div className="flex min-h-11 items-center gap-3">
              <CategoryIcon icon={record.icon} color={record.color} />
              <span className="min-w-0 flex-1">
                <span className="block text-base break-words">
                  {record.name}
                </span>
                <span className="block text-sm text-muted-foreground tabular-nums">
                  {first > 0 && since !== undefined
                    ? text.perMonthSince
                        .replace("{amount}", budget)
                        .replace("{month}", monthShort(since))
                    : text.perMonth.replace("{amount}", budget)}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold">
                {text.keptOf
                  .replace("{kept}", String(record.kept))
                  .replace("{counted}", String(record.counted))}
              </span>
            </div>
            <ul className="flex flex-wrap gap-2">
              {record.months.map((result, position) => (
                <MonthCell
                  key={months[position] ?? position}
                  result={result}
                  month={months[position] ?? ""}
                />
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
