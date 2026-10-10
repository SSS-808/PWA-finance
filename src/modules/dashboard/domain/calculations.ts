import {
  CURRENCY_CODES,
  type CurrencyCode,
  type Money,
  add,
  isZero,
  negate,
  subtract,
  sum,
  zero,
} from "@/modules/money";

// The biggest spending categories shown on their own; the rest become "Other"
export const TOP_CATEGORIES = 5;

// Amounts are as stored, so an expense is negative; categoryId null or unknown counts as "Other"
export type SummaryRow = {
  kind: string;
  amount: Money;
  categoryId: string | null;
};

// categoryId is null for the "Other" bucket, which has no name of its own
export type CategorySpending = {
  categoryId: string | null;
  name: string;
  amount: Money;
  share: number;
};

export type CurrencySummary = {
  currency: CurrencyCode;
  income: Money;
  spending: Money;
  saved: Money;
  savingsRate: number | null;
  byCategory: CategorySpending[];
};

// Whole percent of income that was kept; null without income, negative when spending is higher
export function savingsRate(income: Money, spending: Money): number | null {
  if (isZero(income)) return null;
  // Adding 0 turns -0 into 0
  return (
    Math.round((subtract(income, spending).minor / income.minor) * 100) + 0
  );
}

function bySpendingThenName(a: CategorySpending, b: CategorySpending): number {
  return b.amount.minor - a.amount.minor || a.name.localeCompare(b.name, "en");
}

// Spending per category, largest first: the top few, then everything else as one "Other" bucket
function spendingByCategory(
  expenses: readonly SummaryRow[],
  categoriesById: ReadonlyMap<string, string>,
  spending: Money,
): CategorySpending[] {
  const { currency } = spending;
  const named = new Map<string, { name: string; amount: Money }>();
  let unnamed = zero(currency);
  for (const row of expenses) {
    const spent = negate(row.amount);
    const name =
      row.categoryId === null ? undefined : categoriesById.get(row.categoryId);
    if (row.categoryId === null || name === undefined) {
      unnamed = add(unnamed, spent);
    } else {
      const current = named.get(row.categoryId);
      named.set(row.categoryId, {
        name,
        amount: add(current?.amount ?? zero(currency), spent),
      });
    }
  }
  const share = (amount: Money) => amount.minor / spending.minor;
  const ranked: CategorySpending[] = [...named].map(([categoryId, item]) => ({
    categoryId,
    name: item.name,
    amount: item.amount,
    share: share(item.amount),
  }));
  ranked.sort(bySpendingThenName);
  const top = ranked.slice(0, TOP_CATEGORIES);
  const other = sum(
    [unnamed, ...ranked.slice(TOP_CATEGORIES).map((item) => item.amount)],
    currency,
  );
  if (!isZero(other)) {
    top.push({
      categoryId: null,
      name: "",
      amount: other,
      share: share(other),
    });
  }
  return top;
}

export function emptySummary(currency: CurrencyCode): CurrencySummary {
  return {
    currency,
    income: zero(currency),
    spending: zero(currency),
    saved: zero(currency),
    savingsRate: null,
    byCategory: [],
  };
}

// One summary per currency that has income or expenses; transfers, starting amounts and fixes are ignored
export function monthSummary(
  rows: readonly SummaryRow[],
  categoriesById: ReadonlyMap<string, string>,
): CurrencySummary[] {
  const summaries: CurrencySummary[] = [];
  for (const currency of CURRENCY_CODES) {
    const inCurrency = rows.filter((row) => row.amount.currency === currency);
    const incomes = inCurrency.filter((row) => row.kind === "income");
    const expenses = inCurrency.filter((row) => row.kind === "expense");
    if (incomes.length === 0 && expenses.length === 0) continue;
    const income = sum(
      incomes.map((row) => row.amount),
      currency,
    );
    const spending = negate(
      sum(
        expenses.map((row) => row.amount),
        currency,
      ),
    );
    summaries.push({
      currency,
      income,
      spending,
      saved: subtract(income, spending),
      savingsRate: savingsRate(income, spending),
      byCategory: spendingByCategory(expenses, categoriesById, spending),
    });
  }
  return summaries;
}
