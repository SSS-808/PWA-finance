import {
  CURRENCY_CODES,
  type CurrencyCode,
  type Money,
  add,
  divide,
  isZero,
  subtract,
  sum,
  zero,
} from "@/modules/money";
import {
  type BudgetEntry,
  type BudgetMonthResult,
  type BudgetRecord,
  type CategoryInfo,
  type CategoryRow,
  type ExpenseItem,
  type IncomeSource,
  MIN_FULL_MONTHS,
  type MonthTotals,
  type NormalMonth,
  type Period,
  type UsualCategory,
} from "./types";

const OTHER: CategoryInfo = { name: "", icon: "ellipsis", color: "gray" };
const UNKNOWN: CategoryInfo = { name: "", icon: "tag", color: "gray" };

// The months before currentMonth (YYYY-MM), oldest first
export function fullMonthsOf(currentMonth: string, period: Period): string[] {
  const year = Number(currentMonth.slice(0, 4));
  const index = Number(currentMonth.slice(5, 7)) - 1;
  return Array.from({ length: period }, (_, i) =>
    new Date(Date.UTC(year, index - period + i, 1)).toISOString().slice(0, 7),
  );
}

// The months at or after the first entry; none when there is no entry yet
export function countedMonths(
  fullMonths: readonly string[],
  firstEntryMonth: string | null,
): string[] {
  if (firstEntryMonth === null) return [];
  return fullMonths.filter((month) => month >= firstEntryMonth);
}

// Distinct currencies, the main one first, then the usual order
export function orderCurrencies(
  used: Iterable<CurrencyCode>,
  main: string,
): CurrencyCode[] {
  const present = new Set(used);
  return [
    ...CURRENCY_CODES.filter((code) => code === main && present.has(code)),
    ...CURRENCY_CODES.filter((code) => code !== main && present.has(code)),
  ];
}

// The average counted month; null until there are enough months
export function normalMonth(
  totals: readonly MonthTotals[],
  currency: CurrencyCode,
): NormalMonth | null {
  if (totals.length < MIN_FULL_MONTHS) return null;
  const income = divide(
    sum(
      totals.map((total) => total.income),
      currency,
    ),
    totals.length,
  );
  const spending = divide(
    sum(
      totals.map((total) => total.spending),
      currency,
    ),
    totals.length,
  );
  return {
    months: totals.length,
    income,
    spending,
    kept: subtract(income, spending),
  };
}

type Cells = Map<string, Money>;

type Ranked = CategoryInfo & {
  categoryId: string | null;
  total: Money;
  byMonth: Money[];
};

function addCell(
  cells: Cells,
  month: string,
  amount: Money,
  currency: CurrencyCode,
): void {
  cells.set(month, add(cells.get(month) ?? zero(currency), amount));
}

// Totals per category, largest first: the top few, then everything else as one "Other" item placed last
function rankCategories(
  rows: readonly CategoryRow[],
  months: readonly string[],
  categories: ReadonlyMap<string, CategoryInfo>,
  currency: CurrencyCode,
  top: number,
): Ranked[] {
  const inMonths = new Set(months);
  const named = new Map<string, { info: CategoryInfo; cells: Cells }>();
  const other: Cells = new Map();
  for (const row of rows) {
    if (!inMonths.has(row.month) || row.amount.currency !== currency) continue;
    const info =
      row.categoryId === null ? undefined : categories.get(row.categoryId);
    if (row.categoryId === null || info === undefined) {
      addCell(other, row.month, row.amount, currency);
    } else {
      const bucket = named.get(row.categoryId) ?? { info, cells: new Map() };
      addCell(bucket.cells, row.month, row.amount, currency);
      named.set(row.categoryId, bucket);
    }
  }
  const toRanked = (
    categoryId: string | null,
    info: CategoryInfo,
    cells: Cells,
  ): Ranked => ({
    categoryId,
    ...info,
    total: sum([...cells.values()], currency),
    byMonth: months.map((month) => cells.get(month) ?? zero(currency)),
  });
  const ranked = [...named].map(([id, bucket]) =>
    toRanked(id, bucket.info, bucket.cells),
  );
  ranked.sort(
    (a, b) =>
      b.total.minor - a.total.minor || a.name.localeCompare(b.name, "en"),
  );
  const result = ranked.slice(0, top);
  const cut = new Set(ranked.slice(top).map((item) => item.categoryId));
  for (const [id, bucket] of named) {
    if (!cut.has(id)) continue;
    for (const [month, amount] of bucket.cells) {
      addCell(other, month, amount, currency);
    }
  }
  const rest = toRanked(null, OTHER, other);
  if (!isZero(rest.total)) result.push(rest);
  return result;
}

// What each category usually costs per counted month; the biggest first, the rest as "Other"
export function usualByCategory(
  rows: readonly CategoryRow[],
  months: readonly string[],
  categories: ReadonlyMap<string, CategoryInfo>,
  currency: CurrencyCode,
  top: number,
): UsualCategory[] {
  if (months.length === 0) return [];
  return rankCategories(rows, months, categories, currency, top).map(
    (item) => ({
      categoryId: item.categoryId,
      name: item.name,
      icon: item.icon,
      color: item.color,
      average: divide(item.total, months.length),
      byMonth: item.byMonth,
    }),
  );
}

// Where income came from over the months, with each source's share of the total
export function incomeSources(
  rows: readonly CategoryRow[],
  months: readonly string[],
  categories: ReadonlyMap<string, CategoryInfo>,
  currency: CurrencyCode,
  top: number,
): IncomeSource[] {
  const ranked = rankCategories(rows, months, categories, currency, top);
  const grand = sum(
    ranked.map((item) => item.total),
    currency,
  );
  return ranked.map((item) => ({
    categoryId: item.categoryId,
    name: item.name,
    icon: item.icon,
    color: item.color,
    amount: item.total,
    share: item.total.minor / grand.minor,
  }));
}

// Largest first; ties go to the later date, then the smaller id
export function biggestExpenses(
  items: readonly ExpenseItem[],
  count: number,
): ExpenseItem[] {
  return [...items]
    .sort(
      (a, b) =>
        b.amount.minor - a.amount.minor ||
        b.date.localeCompare(a.date, "en") ||
        a.id.localeCompare(b.id, "en"),
    )
    .slice(0, count);
}

// How each budgeted category did month by month; spent is keyed `${month}|${categoryId}`
export function budgetRecords(
  entries: readonly BudgetEntry[],
  spent: ReadonlyMap<string, Money>,
  months: readonly string[],
  categories: ReadonlyMap<string, CategoryInfo>,
): BudgetRecord[] {
  const inMonths = new Set(months);
  const byCategory = new Map<string, BudgetEntry[]>();
  for (const entry of entries) {
    if (!inMonths.has(entry.month)) continue;
    byCategory.set(entry.categoryId, [
      ...(byCategory.get(entry.categoryId) ?? []),
      entry,
    ]);
  }
  const records: BudgetRecord[] = [];
  for (const [categoryId, list] of byCategory) {
    const budgetOf = new Map(list.map((entry) => [entry.month, entry.budget]));
    const results = months.map((month): BudgetMonthResult => {
      const budget = budgetOf.get(month);
      if (budget === undefined) return "none";
      const used = spent.get(`${month}|${categoryId}`)?.minor ?? 0;
      return used <= budget.minor ? "kept" : "over";
    });
    const latest = list.reduce((a, b) => (b.month > a.month ? b : a));
    records.push({
      categoryId,
      ...(categories.get(categoryId) ?? UNKNOWN),
      budget: latest.budget,
      months: results,
      kept: results.filter((result) => result === "kept").length,
      counted: results.filter((result) => result !== "none").length,
    });
  }
  return records.sort((a, b) => a.name.localeCompare(b.name, "en"));
}
