import Link from "next/link";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { monthLabel } from "@/modules/transactions";
import type { BudgetGroup, BudgetLine } from "../domain/calculations";
import { Progress, fill } from "./budget-progress";

function Line({
  line,
  currency,
  canEdit,
}: {
  line: BudgetLine;
  currency: string;
  canEdit: boolean;
}) {
  return (
    <li className="space-y-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-base font-medium break-words">
          {line.hidden
            ? `${line.name} ${en.categories.hiddenSuffix}`
            : line.name}
        </p>
        {canEdit ? (
          <Link
            href={`/budgets/edit?category=${line.categoryId}&currency=${currency}`}
            className="inline-flex min-h-12 shrink-0 items-center rounded-lg px-3 text-base underline underline-offset-4"
          >
            {en.budgets.edit}
          </Link>
        ) : null}
      </div>
      <Progress label={line.name} numbers={line} />
    </li>
  );
}

// One section per currency: a total line, then a line per budgeted category
export function BudgetList({
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
      <div className="space-y-4 rounded-lg border border-border px-4 py-6">
        <h2 className="text-xl font-semibold">{en.budgets.empty}</h2>
        <Button asChild className="h-12 w-full text-base">
          <Link href="/budgets/new">{en.budgets.add}</Link>
        </Button>
      </div>
    ) : (
      <p className="text-base text-muted-foreground">
        {fill(en.budgets.emptyPast, { month: monthLabel(month) })}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section
          key={group.currency}
          aria-labelledby={`budgets-${group.currency}`}
          className="space-y-3 rounded-lg border border-border px-4 py-5"
        >
          <h2
            id={`budgets-${group.currency}`}
            className="text-xl font-semibold"
          >
            {en.currencies[group.currency]}
          </h2>
          <div className="space-y-2">
            <p className="text-base font-semibold">{en.budgets.total}</p>
            <Progress label={en.budgets.total} numbers={group} />
          </div>
          <ul className="divide-y divide-border">
            {group.lines.map((line) => (
              <Line
                key={line.categoryId}
                line={line}
                currency={group.currency}
                canEdit={isCurrentMonth}
              />
            ))}
          </ul>
        </section>
      ))}
      {isCurrentMonth ? (
        <Button asChild className="h-12 w-full text-base">
          <Link href="/budgets/new">{en.budgets.add}</Link>
        </Button>
      ) : null}
    </div>
  );
}
