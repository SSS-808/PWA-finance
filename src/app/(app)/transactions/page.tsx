import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { listAccounts } from "@/modules/accounts";
import { listCategories } from "@/modules/categories";
import { getProfile, todayIn } from "@/modules/profile";
import {
  HistoryFilterBar,
  HistoryList,
  SavedNotice,
  baseFilters,
  filtersToQuery,
  listTransactions,
  parseFilters,
} from "@/modules/transactions";

export default function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.transactions.title}
      </h1>
      <Suspense>
        <HistoryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function HistoryContent({
  searchParams,
}: {
  searchParams: PageProps<"/transactions">["searchParams"];
}) {
  const params = await searchParams;
  const { saved, saved_transfer: savedTransfer, deleted } = params;
  const profile = await getProfile();
  const today = todayIn(profile.timeZone);
  const filters = parseFilters(params, today);
  const [days, accounts, expenseCategories, incomeCategories] =
    await Promise.all([
      listTransactions(filters),
      listAccounts(),
      listCategories("expense"),
      listCategories("income"),
    ]);
  const count = days.reduce((total, day) => total + day.items.length, 0);
  const narrowed =
    filters.accountId || filters.categoryId || filters.type || filters.q;

  return (
    <div className="space-y-6">
      <SavedNotice
        saved={saved}
        savedTransfer={savedTransfer}
        deleted={deleted}
      />
      <HistoryFilterBar
        filters={filters}
        today={today}
        accounts={accounts}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
      />
      {days.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {count === 1
              ? en.transactions.filters.countOne
              : en.transactions.filters.count.replace("{n}", String(count))}
          </p>
          <HistoryList days={days} today={today} />
        </div>
      ) : narrowed ? (
        <div className="space-y-2 rounded-lg border border-border px-4 py-6">
          <h2 className="text-xl font-semibold">
            {en.transactions.filters.none}
          </h2>
          <Link
            href={`/transactions?${filtersToQuery(baseFilters(filters.month))}`}
            className="inline-flex min-h-12 items-center text-base underline underline-offset-4"
          >
            {en.transactions.filters.clear}
          </Link>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-border px-4 py-6">
          <h2 className="text-xl font-semibold">{en.transactions.empty}</h2>
          <Button asChild className="h-12 w-full text-base">
            <Link href="/transactions/new?from=%2Ftransactions">
              {en.transactions.addOne}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
