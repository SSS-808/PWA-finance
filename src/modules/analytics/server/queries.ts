import "server-only";
import { createClient } from "@/lib/supabase/server";
import { listAccounts } from "@/modules/accounts";
import { requireUser } from "@/modules/auth";
import { listAllCategories } from "@/modules/categories";
import {
  type CategorySpending,
  type SummaryRow,
  TOP_CATEGORIES,
  monthSummary,
  savingsRate,
} from "@/modules/dashboard";
import { type BudgetChange, activeBudgets } from "@/modules/budgets";
import {
  type CurrencyCode,
  type Money,
  add,
  isCurrencyCode,
  money,
  negate,
  zero,
} from "@/modules/money";
import { getProfile, todayIn } from "@/modules/profile";
import { monthRange } from "@/modules/transactions";
import {
  budgetRecords,
  biggestExpenses,
  countedMonths,
  fullMonthsOf,
  incomeSources,
  normalMonth,
  orderCurrencies,
  usualByCategory,
} from "../domain/calculations";
import { parsePeriod, pickCurrency } from "../domain/params";
import {
  BIGGEST_COUNT,
  type BudgetEntry,
  type BudgetRecord,
  type CategoryInfo,
  type CategoryRow,
  DEFAULT_PERIOD,
  type ExpenseItem,
  type IncomeSource,
  MIN_FULL_MONTHS,
  type MonthTotals,
  type NormalMonth,
  type Period,
  type UsualCategory,
} from "../domain/types";

export type InsightsBar = MonthTotals;
export type InsightsPie = {
  month: string;
  spending: Money;
  byCategory: CategorySpending[];
};
export type BiggestRow = ExpenseItem & CategoryInfo & { accountName: string };

export type Insights = {
  period: Period;
  currentMonth: string;
  fullMonths: string[];
  counted: string[];
  currencies: CurrencyCode[];
  currency: CurrencyCode | null;
  bars: InsightsBar[];
  pies: InsightsPie[];
  normal: (NormalMonth & { savingsRate: number | null }) | null;
  usual: UsualCategory[];
  biggest: BiggestRow[];
  budgets: BudgetRecord[];
  sources: IncomeSource[];
};

// One income or expense; amount is positive
type Entry = {
  id: string;
  kind: "income" | "expense";
  amount: Money;
  categoryId: string | null;
  date: string;
  note: string | null;
  accountId: string;
};

// Matches the API's row limit, so a longer list is read in pages
const PAGE_SIZE = 1000;

type Page<Row> = {
  data: Row[] | null;
  error: { code: string; message: string } | null;
};

// Reads every row, one page at a time
async function readAllPages<Row>(
  readPage: (from: number, to: number) => PromiseLike<Page<Row>>,
  failure: string,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await readPage(start, start + PAGE_SIZE - 1);
    if (error || data === null) throw new Error(failure, { cause: error });
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

function toCurrency(value: string): CurrencyCode {
  // The database checks this value, so anything else is a bug
  if (!isCurrencyCode(value)) throw new Error(`Unexpected currency: ${value}`);
  return value;
}

// Every non-deleted income and expense from the first month on, on all accounts, optionally in one currency
async function loadEntries(
  fullMonths: readonly string[],
  currentMonth: string,
  currency: CurrencyCode | null,
): Promise<Entry[]> {
  const supabase = await createClient();
  const from = `${fullMonths.at(0) ?? currentMonth}-01`;
  const { to } = monthRange(currentMonth);
  const rows = await readAllPages((start, end) => {
    let query = supabase
      .from("transactions")
      .select(
        "id, kind, amount_minor, currency, category_id, transaction_date, description, account_id",
      )
      .in("kind", ["income", "expense"])
      .is("deleted_at", null)
      .gte("transaction_date", from)
      .lt("transaction_date", to);
    if (currency !== null) query = query.eq("currency", currency);
    return query.order("id").range(start, end);
  }, "Could not load the transactions");
  return rows.map((row) => {
    const stored = money(row.amount_minor, toCurrency(row.currency));
    const isExpense = row.kind === "expense";
    return {
      id: row.id,
      kind: isExpense ? "expense" : "income",
      amount: isExpense ? negate(stored) : stored,
      categoryId: row.category_id,
      date: row.transaction_date,
      note: row.description,
      accountId: row.account_id,
    };
  });
}

// The month (YYYY-MM) of the earliest income or expense in a currency, over all time
async function loadFirstEntryMonth(
  currency: CurrencyCode,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("transaction_date")
    .in("kind", ["income", "expense"])
    .is("deleted_at", null)
    .eq("currency", currency)
    .order("transaction_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error("Could not load the transactions", { cause: error });
  }
  return data === null ? null : data.transaction_date.slice(0, 7);
}

// Income, spending and the spending split of each month, for one currency
function summarise(
  entries: readonly Entry[],
  months: readonly string[],
  categoriesById: ReadonlyMap<string, CategoryInfo>,
  currency: CurrencyCode,
): { bars: InsightsBar[]; pies: InsightsPie[] } {
  const bars: InsightsBar[] = [];
  const pies: InsightsPie[] = [];
  for (const month of months) {
    const rows: SummaryRow[] = entries
      .filter((entry) => entry.date.startsWith(month))
      .map((entry) => ({
        kind: entry.kind,
        amount: entry.kind === "expense" ? negate(entry.amount) : entry.amount,
        categoryId: entry.categoryId,
      }));
    const summary = monthSummary(rows, categoriesById).find(
      (item) => item.currency === currency,
    );
    const income = summary?.income ?? zero(currency);
    const spending = summary?.spending ?? zero(currency);
    bars.push({ month, income, spending });
    pies.push({ month, spending, byCategory: summary?.byCategory ?? [] });
  }
  return { bars, pies };
}

// The months that count and the bar months for one currency
function monthsOf(
  fullMonths: readonly string[],
  currentMonth: string,
  firstEntryMonth: string | null,
): { counted: string[]; barMonths: string[] } {
  return {
    counted: countedMonths(fullMonths, firstEntryMonth),
    barMonths: [...fullMonths, currentMonth].filter(
      (month) => firstEntryMonth !== null && month >= firstEntryMonth,
    ),
  };
}

function withSavingsRate(
  normal: NormalMonth | null,
): (NormalMonth & { savingsRate: number | null }) | null {
  return normal === null
    ? null
    : { ...normal, savingsRate: savingsRate(normal.income, normal.spending) };
}

// Every budget change up to a month (YYYY-MM), for one currency
async function loadBudgetChanges(
  lastMonth: string,
  currency: CurrencyCode,
): Promise<BudgetChange[]> {
  const supabase = await createClient();
  const rows = await readAllPages(
    (from, to) =>
      supabase
        .from("budgets")
        .select("category_id, currency, start_month, amount_minor")
        .lte("start_month", `${lastMonth}-01`)
        .order("id")
        .range(from, to),
    "Could not load the budgets",
  );
  return rows
    .filter((row) => row.currency === currency)
    .map((row) => ({
      categoryId: row.category_id,
      currency,
      // start_month is a date like 2026-10-01; the app works with YYYY-MM
      startMonth: row.start_month.slice(0, 7),
      amountMinor: row.amount_minor,
    }));
}

function emptyInsights(
  period: Period,
  currentMonth: string,
  fullMonths: string[],
): Insights {
  return {
    period,
    currentMonth,
    fullMonths,
    counted: [],
    currencies: [],
    currency: null,
    bars: [],
    pies: [],
    normal: null,
    usual: [],
    biggest: [],
    budgets: [],
    sources: [],
  };
}

// Everything the Insights page shows for a period and a currency; a bad period or currency falls back
export async function getInsights(
  rawPeriod: unknown,
  rawCurrency: unknown,
): Promise<Insights> {
  await requireUser();
  const [profile, categories, accounts] = await Promise.all([
    getProfile(),
    listAllCategories(),
    listAccounts(),
  ]);
  const currentMonth = todayIn(profile.timeZone).slice(0, 7);
  const period = parsePeriod(rawPeriod);
  const fullMonths = fullMonthsOf(currentMonth, period);
  const entries = await loadEntries(fullMonths, currentMonth, null);
  const currencies = orderCurrencies(
    entries.map((entry) => entry.amount.currency),
    profile.baseCurrency,
  );
  const currency = pickCurrency(rawCurrency, currencies);
  if (currency === null) return emptyInsights(period, currentMonth, fullMonths);

  const firstEntryMonth = await loadFirstEntryMonth(currency);
  const { counted, barMonths } = monthsOf(
    fullMonths,
    currentMonth,
    firstEntryMonth,
  );
  const inCurrency = entries.filter(
    (entry) => entry.amount.currency === currency,
  );
  const categoriesById = new Map<string, CategoryInfo>(
    categories.map((category) => [
      category.id,
      { name: category.name, icon: category.icon, color: category.color },
    ]),
  );
  const { bars, pies } = summarise(
    inCurrency,
    barMonths,
    categoriesById,
    currency,
  );
  const normal = withSavingsRate(
    normalMonth(
      bars.filter((bar) => counted.includes(bar.month)),
      currency,
    ),
  );

  const toRows = (kind: Entry["kind"]): CategoryRow[] =>
    inCurrency
      .filter((entry) => entry.kind === kind)
      .map((entry) => ({
        month: entry.date.slice(0, 7),
        categoryId: entry.categoryId,
        amount: entry.amount,
      }));
  const expenseRows = toRows("expense");
  let usual: UsualCategory[] = [];
  let sources: IncomeSource[] = [];
  let budgets: BudgetRecord[] = [];
  const lastCounted = counted.at(-1);
  if (counted.length >= MIN_FULL_MONTHS && lastCounted !== undefined) {
    usual = usualByCategory(
      expenseRows,
      counted,
      categoriesById,
      currency,
      TOP_CATEGORIES,
    );
    sources = incomeSources(
      toRows("income"),
      counted,
      categoriesById,
      currency,
      TOP_CATEGORIES,
    );
    const changes = await loadBudgetChanges(lastCounted, currency);
    const entriesOfBudgets: BudgetEntry[] = counted.flatMap((month) =>
      activeBudgets(changes, month).map((change) => ({
        month,
        categoryId: change.categoryId,
        budget: money(change.amountMinor, currency),
      })),
    );
    const spent = new Map<string, Money>();
    for (const row of expenseRows) {
      if (row.categoryId === null) continue;
      const key = `${row.month}|${row.categoryId}`;
      spent.set(key, add(spent.get(key) ?? zero(currency), row.amount));
    }
    budgets = budgetRecords(entriesOfBudgets, spent, counted, categoriesById);
  }

  const accountNames = new Map(
    accounts.map((account) => [account.id, account.name]),
  );
  const biggest = biggestExpenses(
    inCurrency
      .filter(
        (entry) =>
          entry.kind === "expense" &&
          barMonths.includes(entry.date.slice(0, 7)),
      )
      .map((entry) => ({
        id: entry.id,
        date: entry.date,
        note: entry.note,
        categoryId: entry.categoryId,
        accountId: entry.accountId,
        amount: entry.amount,
      })),
    BIGGEST_COUNT,
  ).map((item) => ({
    ...item,
    ...((item.categoryId === null
      ? undefined
      : categoriesById.get(item.categoryId)) ?? {
      name: "",
      icon: "ellipsis",
      color: "gray",
    }),
    accountName: accountNames.get(item.accountId) ?? "",
  }));

  return {
    period,
    currentMonth,
    fullMonths,
    counted,
    currencies,
    currency,
    bars,
    pies,
    normal,
    usual,
    biggest,
    budgets,
    sources,
  };
}

// The main currency's normal month spending over the default period, for the More row; null until it has 2 counted months
export async function getNormalMonthOut(): Promise<Money | null> {
  await requireUser();
  const profile = await getProfile();
  const currency = toCurrency(profile.baseCurrency);
  const currentMonth = todayIn(profile.timeZone).slice(0, 7);
  const fullMonths = fullMonthsOf(currentMonth, DEFAULT_PERIOD);
  const [entries, firstEntryMonth] = await Promise.all([
    loadEntries(fullMonths, currentMonth, currency),
    loadFirstEntryMonth(currency),
  ]);
  const { counted, barMonths } = monthsOf(
    fullMonths,
    currentMonth,
    firstEntryMonth,
  );
  const { bars } = summarise(entries, barMonths, new Map(), currency);
  return (
    normalMonth(
      bars.filter((bar) => counted.includes(bar.month)),
      currency,
    )?.spending ?? null
  );
}
