import {
  CURRENCY_CODES,
  type CurrencyCode,
  type Money,
  add,
  money,
  negate,
  subtract,
  sum,
  zero,
} from "@/modules/money";

// startMonth is "YYYY-MM"; the change applies from that month on
export type BudgetChange = {
  categoryId: string;
  currency: CurrencyCode;
  startMonth: string;
  amountMinor: number;
};

// amountMinor is negative, as stored
export type ExpenseRow = {
  categoryId: string;
  currency: CurrencyCode;
  amountMinor: number;
};

export type BudgetCategory = {
  id: string;
  name: string;
  hidden: boolean;
  icon: string;
  color: string;
};

export type BudgetLine = {
  categoryId: string;
  name: string;
  hidden: boolean;
  icon: string;
  color: string;
  budget: Money;
  spent: Money;
  left: Money;
  percent: number;
};

export type BudgetGroup = {
  currency: CurrencyCode;
  lines: BudgetLine[];
  budget: Money;
  spent: Money;
  left: Money;
  percent: number;
};

function pairKey(categoryId: string, currency: CurrencyCode): string {
  return `${categoryId}|${currency}`;
}

// The budgets in force in a month: per category and currency the latest change at or before it, unless that change is 0
export function activeBudgets(
  changes: readonly BudgetChange[],
  month: string,
): BudgetChange[] {
  const latest = new Map<string, BudgetChange>();
  for (const change of changes) {
    if (change.startMonth > month) continue;
    const key = pairKey(change.categoryId, change.currency);
    const current = latest.get(key);
    if (current === undefined || change.startMonth > current.startMonth) {
      latest.set(key, change);
    }
  }
  return [...latest.values()].filter((change) => change.amountMinor > 0);
}

// Whole percent of the budget that is used; it can go above 100
export function usedPercent(spent: Money, budget: Money): number {
  return Math.floor((spent.minor * 100) / budget.minor);
}

function byName(a: BudgetLine, b: BudgetLine): number {
  return (
    a.name.localeCompare(b.name, "en") ||
    a.categoryId.localeCompare(b.categoryId)
  );
}

// The budgets closest to (or furthest over) their limit come first; ties go by name
export function mostUsedLines(
  lines: readonly BudgetLine[],
  limit: number,
): BudgetLine[] {
  return [...lines]
    .sort((a, b) => b.percent - a.percent || byName(a, b))
    .slice(0, limit);
}

// One group per currency (in the order of CURRENCY_CODES), lines in the person's category order
export function budgetGroups(
  changes: readonly BudgetChange[],
  expenses: readonly ExpenseRow[],
  categories: readonly BudgetCategory[],
  month: string,
): BudgetGroup[] {
  const active = activeBudgets(changes, month);
  const activeByPair = new Map(
    active.map((change) => [
      pairKey(change.categoryId, change.currency),
      change,
    ]),
  );
  const spentByPair = new Map<string, Money>();
  for (const row of expenses) {
    const key = pairKey(row.categoryId, row.currency);
    spentByPair.set(
      key,
      add(
        spentByPair.get(key) ?? zero(row.currency),
        negate(money(row.amountMinor, row.currency)),
      ),
    );
  }

  const groups: BudgetGroup[] = [];
  for (const currency of CURRENCY_CODES) {
    const lines: BudgetLine[] = [];
    for (const category of categories) {
      const change = activeByPair.get(pairKey(category.id, currency));
      if (change === undefined) continue;
      const budget = money(change.amountMinor, currency);
      const spent =
        spentByPair.get(pairKey(category.id, currency)) ?? zero(currency);
      lines.push({
        categoryId: category.id,
        name: category.name,
        hidden: category.hidden,
        icon: category.icon,
        color: category.color,
        budget,
        spent,
        left: subtract(budget, spent),
        percent: usedPercent(spent, budget),
      });
    }
    if (lines.length === 0) continue;
    const budget = sum(
      lines.map((line) => line.budget),
      currency,
    );
    const spent = sum(
      lines.map((line) => line.spent),
      currency,
    );
    groups.push({
      currency,
      lines,
      budget,
      spent,
      left: subtract(budget, spent),
      percent: usedPercent(spent, budget),
    });
  }
  return groups;
}
