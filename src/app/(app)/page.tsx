import Link from "next/link";
import { Suspense } from "react";
import {
  CardListSkeleton,
  HeroSkeleton,
  LoadingStatus,
  Skeleton,
} from "@/components/shared/skeleton";
import { ToastOnce } from "@/components/shared/toast-once";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { BudgetSummary, getBudgetMonth } from "@/modules/budgets";
import {
  CurrencyCard,
  DashboardMonthBar,
  MoneyButtons,
  SpendingCard,
  getDashboard,
  mainFirst,
} from "@/modules/dashboard";
import { GoalSummary, listGoals } from "@/modules/goals";
import { getProfile, todayIn } from "@/modules/profile";
import {
  HistoryList,
  SavedNotice,
  monthLabel,
  parseFilters,
} from "@/modules/transactions";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <div className="w-full max-w-2xl space-y-4">
      <h1 className="sr-only">{en.dashboard.title}</h1>
      <Suspense
        fallback={
          <div className="space-y-4">
            <LoadingStatus />
            <HeroSkeleton />
            <div aria-hidden="true" className="grid grid-cols-2 gap-3">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
            <CardListSkeleton rows={3} />
          </div>
        }
      >
        <HomeContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function HomeContent({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const params = await searchParams;
  const { notice, saved, saved_transfer: savedTransfer, deleted } = params;
  const profile = await getProfile();
  const today = todayIn(profile.timeZone);
  const currentMonth = today.slice(0, 7);
  // "all" and bad values fall back to this month
  const month = parseFilters(params, today).month ?? currentMonth;
  const [{ cards, recent }, budgets, goals] = await Promise.all([
    getDashboard(month),
    getBudgetMonth(month),
    listGoals(),
  ]);
  const ordered = mainFirst(cards, profile.baseCurrency);
  const [main, ...others] = ordered;
  const withSpending = ordered.filter(
    (card) => card.summary.byCategory.length > 0,
  );
  return (
    <div className="space-y-4">
      {notice === "password-updated" ? (
        <ToastOnce message={en.home.passwordUpdated} param="notice" />
      ) : null}
      <SavedNotice
        saved={saved}
        savedTransfer={savedTransfer}
        deleted={deleted}
      />
      {main === undefined ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card px-4 py-6">
          <h2 className="text-xl font-semibold">{en.home.startTitle}</h2>
          <Button asChild className="h-12 w-full text-base">
            <Link href="/accounts/new">{en.accounts.addFirst}</Link>
          </Button>
        </div>
      ) : (
        <>
          <DashboardMonthBar month={month} currentMonth={currentMonth} />
          <CurrencyCard card={main} main />
          <MoneyButtons />
          {others.map((card) => (
            <CurrencyCard key={card.currency} card={card} main={false} />
          ))}
          {withSpending.length > 0 ? (
            withSpending.map((card) => (
              <SpendingCard key={card.currency} card={card} month={month} />
            ))
          ) : (
            <p className="rounded-2xl border border-border bg-card px-4 py-5 text-base text-muted-foreground">
              {en.dashboard.noSpending.replace("{month}", monthLabel(month))}
            </p>
          )}
          <BudgetSummary
            groups={budgets.groups}
            month={month}
            isCurrentMonth={month === currentMonth}
          />
          <GoalSummary goals={goals.active} today={today} />
          <section aria-labelledby="dashboard-recent" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="dashboard-recent" className="text-xl font-semibold">
                {en.dashboard.recent}
              </h2>
              <Link
                href="/transactions"
                className="inline-flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-primary underline-offset-4 hover:underline"
              >
                {en.dashboard.seeAll}
              </Link>
            </div>
            {recent.length > 0 ? (
              <HistoryList days={recent} today={today} headingLevel={3} />
            ) : (
              <div className="space-y-4 rounded-2xl border border-border bg-card px-4 py-6">
                <h3 className="text-xl font-semibold">
                  {en.transactions.empty}
                </h3>
                <Button asChild className="h-12 w-full text-base">
                  <Link href="/transactions/new?from=%2F">
                    {en.transactions.addOne}
                  </Link>
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
