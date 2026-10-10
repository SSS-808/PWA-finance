import "server-only";
import { createClient } from "@/lib/supabase/server";
import { groupByCurrency, listAccounts } from "@/modules/accounts";
import { requireUser } from "@/modules/auth";
import { listAllCategories } from "@/modules/categories";
import { isCurrencyCode, money } from "@/modules/money";
import {
  type DayGroup,
  baseFilters,
  listTransactions,
  monthRange,
} from "@/modules/transactions";
import {
  type SummaryRow,
  emptySummary,
  monthSummary,
} from "../domain/calculations";
import type { DashboardCard } from "../domain/types";

// No cards means no active accounts
export type Dashboard = { cards: DashboardCard[]; recent: DayGroup[] };

const RECENT_COUNT = 10;

// Matches the API's row limit, so a longer month is read in pages
const PAGE_SIZE = 1000;

// Every non-deleted income and expense of the month, whatever the account
async function loadMonthRows(month: string): Promise<SummaryRow[]> {
  const supabase = await createClient();
  const { from, to } = monthRange(month);
  const rows: SummaryRow[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("transactions")
      .select("kind, amount_minor, currency, category_id")
      .in("kind", ["income", "expense"])
      .is("deleted_at", null)
      .gte("transaction_date", from)
      .lt("transaction_date", to)
      .order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) {
      throw new Error("Could not load the month's transactions", {
        cause: error,
      });
    }
    for (const record of data) {
      // The database checks this value, so anything else is a bug
      if (!isCurrencyCode(record.currency)) {
        throw new Error(`Unexpected transaction currency: ${record.currency}`);
      }
      rows.push({
        kind: record.kind,
        amount: money(record.amount_minor, record.currency),
        categoryId: record.category_id,
      });
    }
    if (data.length < PAGE_SIZE) return rows;
  }
}

// Everything Home shows for one month (YYYY-MM): a card per currency with active accounts, and the latest transactions
export async function getDashboard(month: string): Promise<Dashboard> {
  await requireUser();
  const [accounts, categories, rows, recent] = await Promise.all([
    listAccounts(),
    listAllCategories(),
    loadMonthRows(month),
    listTransactions(baseFilters(null), RECENT_COUNT),
  ]);
  const summaries = monthSummary(
    rows,
    new Map(categories.map((category) => [category.id, category.name])),
  );
  const cards = groupByCurrency(
    accounts.filter((account) => !account.archived),
  ).map((group) => ({
    currency: group.currency,
    balance: group.total,
    summary:
      summaries.find((summary) => summary.currency === group.currency) ??
      emptySummary(group.currency),
  }));
  return { cards, recent };
}
