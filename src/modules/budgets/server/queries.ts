import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { listAllCategories } from "@/modules/categories";
import { type CurrencyCode, isCurrencyCode } from "@/modules/money";
import { getProfile, todayIn } from "@/modules/profile";
import { monthRange } from "@/modules/transactions";
import {
  type BudgetChange,
  type BudgetGroup,
  type ExpenseRow,
  budgetGroups,
} from "../domain/calculations";
import type { BudgetToEdit } from "../domain/types";

export type BudgetMonth = {
  month: string;
  currentMonth: string;
  groups: BudgetGroup[];
};

// Matches the API's row limit, so a longer list is read in pages
const PAGE_SIZE = 1000;

const idSchema = z.uuid();

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

async function loadChanges(month: string): Promise<BudgetChange[]> {
  const supabase = await createClient();
  const rows = await readAllPages(
    (from, to) =>
      supabase
        .from("budgets")
        .select("category_id, currency, start_month, amount_minor")
        .lte("start_month", `${month}-01`)
        .order("id")
        .range(from, to),
    "Could not load the budgets",
  );
  return rows.map((row) => ({
    categoryId: row.category_id,
    currency: toCurrency(row.currency),
    // start_month is a date like 2026-10-01; the app works with YYYY-MM
    startMonth: row.start_month.slice(0, 7),
    amountMinor: row.amount_minor,
  }));
}

async function loadExpenses(month: string): Promise<ExpenseRow[]> {
  const supabase = await createClient();
  const { from, to } = monthRange(month);
  const rows = await readAllPages(
    (start, end) =>
      supabase
        .from("transactions")
        .select("category_id, currency, amount_minor")
        .eq("kind", "expense")
        .is("deleted_at", null)
        .gte("transaction_date", from)
        .lt("transaction_date", to)
        .order("id")
        .range(start, end),
    "Could not load the budgets",
  );
  return rows.flatMap((row) =>
    // An expense always has a category, but the column allows null
    row.category_id === null
      ? []
      : [
          {
            categoryId: row.category_id,
            currency: toCurrency(row.currency),
            amountMinor: row.amount_minor,
          },
        ],
  );
}

// The current month (YYYY-MM) in the person's time zone, worked out on the server
async function currentMonthOf(): Promise<string> {
  const profile = await getProfile();
  return todayIn(profile.timeZone).slice(0, 7);
}

// The budgets of one month (YYYY-MM) with what was spent against them
export async function getBudgetMonth(month: string): Promise<BudgetMonth> {
  await requireUser();
  const [changes, expenses, categories, currentMonth] = await Promise.all([
    loadChanges(month),
    loadExpenses(month),
    listAllCategories(),
    currentMonthOf(),
  ]);
  return {
    month,
    currentMonth,
    groups: budgetGroups(changes, expenses, categories, month),
  };
}

// The budget in force this month for one category and currency; a bad id or no budget is a 404
export async function getBudgetToEdit(
  categoryId: string,
  currency: string,
): Promise<BudgetToEdit> {
  await requireUser();
  if (!idSchema.safeParse(categoryId).success || !isCurrencyCode(currency)) {
    notFound();
  }
  const { groups } = await getBudgetMonth(await currentMonthOf());
  const line = groups
    .find((group) => group.currency === currency)
    ?.lines.find((item) => item.categoryId === categoryId);
  if (line === undefined) notFound();
  return {
    categoryId,
    categoryName: line.name,
    currency: line.budget.currency,
    amountMinor: line.budget.minor,
  };
}
