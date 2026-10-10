import Link from "next/link";
import { Suspense } from "react";
import { ToastOnce } from "@/components/shared/toast-once";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import {
  CurrencyCard,
  DashboardMonthBar,
  getDashboard,
} from "@/modules/dashboard";
import { getProfile, todayIn } from "@/modules/profile";
import { HistoryList, SavedNotice, parseFilters } from "@/modules/transactions";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.dashboard.title}
      </h1>
      <Suspense>
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
  const { cards, recent } = await getDashboard(month);
  const greeting = profile.displayName
    ? en.home.greetingNamed.replace("{name}", profile.displayName)
    : en.home.greeting.replace("{email}", profile.email);
  return (
    <div className="space-y-6">
      {notice === "password-updated" ? (
        <ToastOnce message={en.home.passwordUpdated} param="notice" />
      ) : null}
      <SavedNotice
        saved={saved}
        savedTransfer={savedTransfer}
        deleted={deleted}
      />
      <p className="text-base break-words">{greeting}</p>
      {cards.length === 0 ? (
        <div className="space-y-4 rounded-lg border border-border px-4 py-6">
          <h2 className="text-xl font-semibold">{en.home.startTitle}</h2>
          <Button asChild className="h-12 w-full text-base">
            <Link href="/accounts/new">{en.accounts.addFirst}</Link>
          </Button>
        </div>
      ) : (
        <>
          <DashboardMonthBar month={month} currentMonth={currentMonth} />
          {cards.map((card) => (
            <CurrencyCard key={card.currency} card={card} month={month} />
          ))}
          <section aria-labelledby="dashboard-recent" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="dashboard-recent" className="text-xl font-semibold">
                {en.dashboard.recent}
              </h2>
              <Link
                href="/transactions"
                className="inline-flex min-h-12 items-center rounded-lg px-3 text-base underline-offset-4 hover:underline"
              >
                {en.dashboard.seeAll}
              </Link>
            </div>
            {recent.length > 0 ? (
              <HistoryList days={recent} today={today} />
            ) : (
              <div className="space-y-4 rounded-lg border border-border px-4 py-6">
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
