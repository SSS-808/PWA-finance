import { Suspense } from "react";
import { AddLink } from "@/components/shared/add-link";
import {
  CardListSkeleton,
  LoadingStatus,
  Skeleton,
} from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { BudgetList, BudgetNotice, getBudgetMonth } from "@/modules/budgets";
import { DashboardMonthBar } from "@/modules/dashboard";
import { getProfile, todayIn } from "@/modules/profile";
import { parseFilters } from "@/modules/transactions";

export default function BudgetsPage({ searchParams }: PageProps<"/budgets">) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <LoadingStatus />
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {en.budgets.title}
              </h1>
            </div>
            <Skeleton className="h-13 rounded-full" />
            <CardListSkeleton rows={3} label={false} />
          </div>
        }
      >
        <BudgetsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function BudgetsContent({
  searchParams,
}: {
  searchParams: PageProps<"/budgets">["searchParams"];
}) {
  const params = await searchParams;
  const profile = await getProfile();
  const today = todayIn(profile.timeZone);
  const currentMonth = today.slice(0, 7);
  // "all", bad values and months after this one fall back to this month
  const requested = parseFilters(params, today).month;
  const month =
    requested !== null && requested <= currentMonth ? requested : currentMonth;
  const budgets = await getBudgetMonth(month);
  const isCurrentMonth = month === budgets.currentMonth;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {en.budgets.title}
        </h1>
        {isCurrentMonth && budgets.groups.length > 0 ? (
          <AddLink href="/budgets/new" label={en.budgets.add} />
        ) : null}
      </div>
      <BudgetNotice notice={params.notice} />
      <DashboardMonthBar
        month={month}
        currentMonth={currentMonth}
        basePath="/budgets"
      />
      <BudgetList
        groups={budgets.groups}
        month={month}
        isCurrentMonth={isCurrentMonth}
      />
    </div>
  );
}
