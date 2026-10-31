import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  CategoryIcon,
  categoryBarClass,
} from "@/components/shared/category-icon";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { monthLabel } from "@/modules/transactions";
import type { BudgetGroup, BudgetLine } from "../domain/calculations";
import { Progress, fill } from "./budget-progress";

function LineBody({ line }: { line: BudgetLine }) {
  return (
    <>
      <CategoryIcon icon={line.icon} color={line.color} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-base font-medium break-words">
          {line.hidden
            ? `${line.name} ${en.categories.hiddenSuffix}`
            : line.name}
        </p>
        <Progress
          label={line.name}
          numbers={line}
          fillClass={categoryBarClass(line.color)}
        />
      </div>
    </>
  );
}

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
    <li>
      {canEdit ? (
        <Link
          href={`/budgets/edit?category=${line.categoryId}&currency=${currency}`}
          className="flex gap-3 px-4 py-3 hover:bg-muted"
        >
          <LineBody line={line} />
          <span className="sr-only">{en.budgets.edit}</span>
          <ChevronRight
            className="size-5 shrink-0 self-center text-muted-foreground"
            aria-hidden="true"
          />
        </Link>
      ) : (
        <div className="flex gap-3 px-4 py-3">
          <LineBody line={line} />
        </div>
      )}
    </li>
  );
}

// One card per currency: a total on top, then a row per budgeted category
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
      <div className="space-y-4 rounded-2xl border border-border bg-card px-5 py-6">
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
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="space-y-2 px-4 py-4">
            <h2
              id={`budgets-${group.currency}`}
              className="text-sm font-medium text-muted-foreground"
            >
              {en.currencies[group.currency]} <span aria-hidden="true">·</span>{" "}
              {en.budgets.total}
            </h2>
            <Progress label={en.budgets.total} numbers={group} />
          </div>
          <ul className="divide-y divide-border border-t border-border">
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
    </div>
  );
}
