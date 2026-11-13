import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { LoadingStatus, Skeleton } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import {
  BiggestExpenses,
  BudgetRecords,
  CategoryPie,
  CurrencyChips,
  IncomeSources,
  InsightsCard,
  MIN_FULL_MONTHS,
  MonthBars,
  NormalMonthTiles,
  PeriodMenu,
  UsualCategories,
  WaitingCard,
  dayMonth,
  getInsights,
  monthAfter,
  monthName,
  monthRangeLabel,
  monthYear,
} from "@/modules/analytics";
import { getProfile, todayIn } from "@/modules/profile";

export default function InsightsPage({ searchParams }: PageProps<"/insights">) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <BackLink href="/more" label={en.more.back} />
      <Suspense
        fallback={
          <div className="space-y-3">
            <LoadingStatus />
            <h1 className="text-3xl font-semibold tracking-tight">
              {en.insights.title}
            </h1>
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        }
      >
        <InsightsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function InsightsContent({
  searchParams,
}: {
  searchParams: PageProps<"/insights">["searchParams"];
}) {
  const params = await searchParams;
  const [insights, profile] = await Promise.all([
    getInsights(params.period, params.currency),
    getProfile(),
  ]);
  const text = en.insights;
  const { currency, counted, currentMonth } = insights;
  const heading = (
    <h1 className="text-3xl font-semibold tracking-tight">{text.title}</h1>
  );
  if (currency === null) {
    return (
      <div className="space-y-6">
        {heading}
        <p className="rounded-2xl border border-border bg-card p-4 text-base text-muted-foreground">
          {text.empty}
        </p>
      </div>
    );
  }

  const first = counted.at(0);
  const last = counted.at(-1);
  const range =
    first !== undefined && last !== undefined
      ? monthRangeLabel(first, last)
      : "";
  const current = monthName(currentMonth);
  const subtitle =
    range === ""
      ? text.subtitleNone.replace("{current}", current)
      : text.subtitle.replace("{from}", range).replace("{current}", current);
  const initialMonth = last ?? currentMonth;
  const firstBar = insights.bars.at(0);
  const { normal } = insights;
  const cards = text.cards;
  const today = todayIn(profile.timeZone);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          {heading}
          <PeriodMenu period={insights.period} currency={currency} />
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {insights.currencies.length > 1 ? (
        <CurrencyChips
          currencies={insights.currencies}
          current={currency}
          period={insights.period}
        />
      ) : null}

      <InsightsCard
        id="insights-monthly"
        title={cards.monthly.title}
        help={cards.monthly.help}
      >
        <MonthBars
          bars={insights.bars}
          currentMonth={currentMonth}
          initialMonth={initialMonth}
        />
      </InsightsCard>

      <InsightsCard
        id="insights-pie"
        title={cards.pie.title}
        help={cards.pie.help}
      >
        <CategoryPie
          pies={insights.pies}
          currentMonth={currentMonth}
          initialMonth={initialMonth}
        />
      </InsightsCard>

      {normal === null ? (
        <WaitingCard
          title={text.waitingTitle.replace(
            "{month}",
            monthName(
              monthAfter(
                currentMonth,
                counted.length >= MIN_FULL_MONTHS - 1 ? 1 : 2,
              ),
            ),
          )}
          counted={first === undefined ? null : monthYear(first)}
        />
      ) : (
        <InsightsCard
          id="insights-normal"
          title={cards.normal.title}
          help={cards.normal.help}
          subtitle={cards.normal.subtitle
            .replace("{n}", String(normal.months))
            .replace("{range}", range)}
        >
          <NormalMonthTiles
            income={normal.income}
            spending={normal.spending}
            kept={normal.kept}
            savingsRate={normal.savingsRate}
          />
        </InsightsCard>
      )}

      {insights.usual.length > 0 ? (
        <InsightsCard
          id="insights-usual"
          title={cards.usual.title}
          help={cards.usual.help}
          subtitle={cards.usual.subtitle.replace("{range}", range)}
        >
          <UsualCategories items={insights.usual} />
        </InsightsCard>
      ) : null}

      {insights.biggest.length > 0 && firstBar !== undefined ? (
        <InsightsCard
          id="insights-biggest"
          title={cards.biggest.title}
          help={cards.biggest.help}
          subtitle={cards.biggest.subtitle
            .replace("{from}", dayMonth(`${firstBar.month}-01`))
            .replace("{to}", dayMonth(today))}
        >
          <BiggestExpenses items={insights.biggest} />
        </InsightsCard>
      ) : null}

      {insights.budgets.length > 0 ? (
        <InsightsCard
          id="insights-budgets"
          title={cards.budgets.title}
          help={cards.budgets.help}
          subtitle={cards.budgets.subtitle.replace("{range}", range)}
        >
          <BudgetRecords records={insights.budgets} months={counted} />
        </InsightsCard>
      ) : null}

      {insights.sources.length > 0 ? (
        <InsightsCard
          id="insights-sources"
          title={cards.sources.title}
          help={cards.sources.help}
          subtitle={cards.sources.subtitle.replace("{range}", range)}
        >
          <IncomeSources items={insights.sources} />
        </InsightsCard>
      ) : null}
    </div>
  );
}
