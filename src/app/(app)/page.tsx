import Link from "next/link";
import { Suspense } from "react";
import {
  CardListSkeleton,
  HeroSkeleton,
  LoadingStatus,
} from "@/components/shared/skeleton";
import { ToastOnce } from "@/components/shared/toast-once";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import {
  BalanceCarousel,
  CurrencyCard,
  DashboardMonthBar,
  SpendingCard,
  getDashboard,
  mainFirst,
} from "@/modules/dashboard";
import { requireUser } from "@/modules/auth";
import { getProfile, todayIn } from "@/modules/profile";
import { TripLine, getCurrentTrip } from "@/modules/trips";
import {
  HistoryList,
  OutboxLine,
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
  const [profile, user] = await Promise.all([getProfile(), requireUser()]);
  const today = todayIn(profile.timeZone);
  const currentMonth = today.slice(0, 7);
  // "all" and bad values fall back to this month
  const month = parseFilters(params, today).month ?? currentMonth;
  const [{ cards, recent, allSwitchedOff }, currentTrip] = await Promise.all([
    getDashboard(month),
    getCurrentTrip(today),
  ]);
  const ordered = mainFirst(cards, profile.baseCurrency);
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
      {ordered.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card px-4 py-6">
          <h2 className="text-xl font-semibold">
            {allSwitchedOff ? en.home.noneShownTitle : en.home.startTitle}
          </h2>
          <Button asChild className="h-12 w-full text-base">
            <Link href={allSwitchedOff ? "/accounts" : "/accounts/new"}>
              {allSwitchedOff ? en.home.noneShownAction : en.accounts.addFirst}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <DashboardMonthBar month={month} currentMonth={currentMonth} />
          <BalanceCarousel
            labels={ordered.map((card) => en.currencies[card.currency])}
          >
            {ordered.map((card) => (
              <CurrencyCard key={card.currency} card={card} />
            ))}
          </BalanceCarousel>
          <OutboxLine userId={user.id} />
          {currentTrip !== null ? (
            <TripLine current={currentTrip} today={today} />
          ) : null}
          {withSpending.length > 0 ? (
            withSpending.map((card) => (
              <SpendingCard key={card.currency} card={card} month={month} />
            ))
          ) : (
            <p className="rounded-2xl border border-border bg-card px-4 py-5 text-base text-muted-foreground">
              {en.dashboard.noSpending.replace("{month}", monthLabel(month))}
            </p>
          )}
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
