import { Suspense } from "react";
import { en } from "@/messages/en";
import { BudgetList, BudgetNotice, getBudgetMonth } from "@/modules/budgets";
import { DashboardMonthBar } from "@/modules/dashboard";
import { getProfile, todayIn } from "@/modules/profile";
import { parseFilters } from "@/modules/transactions";

export default function BudgetsPage({ searchParams }: PageProps<"/budgets">) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.budgets.title}
      </h1>
      <Suspense>
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
  return (
    <div className="space-y-6">
      <BudgetNotice notice={params.notice} />
      <DashboardMonthBar
        month={month}
        currentMonth={currentMonth}
        basePath="/budgets"
      />
      <BudgetList
        groups={budgets.groups}
        month={month}
        isCurrentMonth={month === budgets.currentMonth}
      />
    </div>
  );
}
