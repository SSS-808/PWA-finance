import Link from "next/link";
import { Suspense } from "react";
import {
  CardListSkeleton,
  LoadingStatus,
  Skeleton,
} from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { listAccounts } from "@/modules/accounts";
import { listAllCategories } from "@/modules/categories";
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
      <Suspense
        fallback={
          <div className="space-y-6">
            <LoadingStatus />
            <div aria-hidden="true" className="space-y-3">
              <Skeleton className="h-13 rounded-full" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
            <div className="space-y-5">
              <CardListSkeleton rows={4} />
              <CardListSkeleton rows={4} />
            </div>
          </div>
        }
      >
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
  const [days, accounts, categories] = await Promise.all([
    listTransactions(filters),
    listAccounts(),
    listAllCategories(),
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
        count={count}
        // The filter list only needs names, so no minimum is passed
        accounts={accounts.map(({ id, name, currency }) => ({
          id,
          name,
          currency,
          free: null,
          minimum: null,
          setAside: null,
          goals: [],
        }))}
        expenseCategories={categories.filter(
          (category) => category.kind === "expense",
        )}
        incomeCategories={categories.filter(
          (category) => category.kind === "income",
        )}
      />
      {days.length > 0 ? (
        <HistoryList days={days} today={today} />
      ) : narrowed ? (
        <div className="space-y-2 rounded-2xl border border-border bg-card px-5 py-6">
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
        <div className="space-y-4 rounded-2xl border border-border bg-card px-5 py-6">
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
