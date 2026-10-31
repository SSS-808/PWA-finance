import Link from "next/link";
import {
  CategoryIcon,
  categoryBarClass,
} from "@/components/shared/category-icon";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { type BudgetGroup, mostUsedLines } from "../domain/calculations";
import { Progress } from "./budget-progress";

// The most used budgets of the month Home shows, a few lines per currency
export function BudgetSummary({
  groups,
  month,
  isCurrentMonth,
}: {
  groups: BudgetGroup[];
  month: string;
  isCurrentMonth: boolean;
}) {
  if (groups.length === 0) {
    return isCurrentMonth ? (
      <Button asChild variant="outline" className="h-12 w-full text-base">
        <Link href="/budgets">{en.budgets.title}</Link>
      </Button>
    ) : null;
  }

  return (
    <section
      aria-labelledby="home-budgets"
      className="space-y-2 rounded-2xl border border-border bg-card px-4 py-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="home-budgets" className="text-lg font-semibold">
          {en.budgets.title}
        </h2>
        <Link
          href={isCurrentMonth ? "/budgets" : `/budgets?month=${month}`}
          className="inline-flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-primary underline-offset-4 hover:underline"
        >
          {en.budgets.seeAll}
        </Link>
      </div>
      {groups.map((group) => (
        <div key={group.currency} className="space-y-1">
          {groups.length > 1 ? (
            <p className="text-sm text-muted-foreground">
              {en.currencies[group.currency]}
            </p>
          ) : null}
          <ul className="divide-y divide-border">
            {mostUsedLines(group.lines, 3).map((line) => (
              <li key={line.categoryId} className="space-y-2 py-3">
                <div className="flex items-center gap-2">
                  <CategoryIcon icon={line.icon} color={line.color} size="sm" />
                  <p className="min-w-0 text-base font-medium break-words">
                    {line.hidden
                      ? `${line.name} ${en.categories.hiddenSuffix}`
                      : line.name}
                  </p>
                </div>
                <Progress
                  label={line.name}
                  numbers={line}
                  fillClass={categoryBarClass(line.color)}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
