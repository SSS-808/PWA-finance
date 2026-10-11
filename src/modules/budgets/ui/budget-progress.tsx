import { ProgressBar } from "@/components/shared/progress-bar";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { type Money, formatMoney, negate } from "@/modules/money";
import type { BudgetLine } from "../domain/calculations";

type Numbers = Pick<BudgetLine, "budget" | "spent" | "left" | "percent">;

// Replaces the placeholders in a text; a function keeps "$" in amounts literal
export function fill(text: string, values: Record<string, string>): string {
  return text.replace(
    /\{(\w+)\}/g,
    (match, key: string) => values[key] ?? match,
  );
}

export function Progress({
  label,
  numbers,
}: {
  label: string;
  numbers: Numbers;
}) {
  const { budget, spent, left, percent } = numbers;
  const over = left.minor < 0;
  const remaining: Money = over ? negate(left) : left;
  return (
    <>
      <p className="text-base tabular-nums">
        {fill(en.budgets.of, {
          spent: formatMoney(spent),
          budget: formatMoney(budget),
        })}
      </p>
      <ProgressBar
        label={label}
        percent={percent}
        tone={over ? "over" : "default"}
      />
      <p
        className={cn(
          "text-base tabular-nums",
          over ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {fill(over ? en.budgets.over : en.budgets.left, {
          amount: formatMoney(remaining),
        })}
      </p>
    </>
  );
}
