import Link from "next/link";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { baseFilters, filtersToQuery } from "@/modules/transactions";
import type { CategorySpending } from "../domain/calculations";
import type { DashboardCard } from "../domain/types";

const rowClass = "block min-h-12 rounded-lg px-3 py-2";

function HeroStat({
  label,
  value,
  main,
}: {
  label: string;
  value: string;
  main: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wider text-hero-muted uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "font-semibold break-words tabular-nums",
          main ? "text-lg" : "text-base",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function FooterStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-hero-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function SpendingRow({
  item,
  month,
}: {
  item: CategorySpending;
  month: string;
}) {
  const content = (
    <>
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-base break-words">
          {item.categoryId === null ? en.dashboard.other : item.name}
        </span>
        <span className="shrink-0 text-right text-base tabular-nums">
          {formatMoney(item.amount)}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="mt-2 block h-2 overflow-hidden rounded-full bg-muted"
      >
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${item.share * 100}%` }}
        />
      </span>
    </>
  );
  // "Other" mixes several categories, so it has nothing to open
  if (item.categoryId === null) {
    return (
      <li>
        <div className={rowClass}>{content}</div>
      </li>
    );
  }
  const query = filtersToQuery({
    ...baseFilters(month),
    categoryId: item.categoryId,
    type: "expense",
  });
  return (
    <li>
      <Link
        href={`/transactions?${query}`}
        className={`${rowClass} hover:bg-muted`}
      >
        {content}
      </Link>
    </li>
  );
}

// One currency in solid emerald: the total balance and the month's numbers; the main currency is bigger
export function CurrencyCard({
  card,
  main,
}: {
  card: DashboardCard;
  main: boolean;
}) {
  const { currency, balance, summary } = card;
  const text = en.dashboard;
  return (
    <section
      aria-labelledby={`dashboard-${currency}`}
      className={cn(
        "rounded-2xl bg-hero text-hero-foreground",
        main ? "space-y-4 p-5" : "space-y-3 px-5 py-4",
      )}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm text-hero-muted">
          <h2 id={`dashboard-${currency}`}>{en.currencies[currency]}</h2>
          <span aria-hidden="true">·</span>
          <span>{text.totalBalance}</span>
        </div>
        <p
          className={cn(
            "font-semibold tracking-tight break-words tabular-nums",
            main ? "text-4xl" : "text-2xl",
          )}
        >
          {formatMoney(balance)}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <HeroStat
          label={text.income}
          value={formatMoney(summary.income, { signDisplay: "exceptZero" })}
          main={main}
        />
        <HeroStat
          label={text.spending}
          value={formatMoney(summary.spending)}
          main={main}
        />
      </dl>
      <dl className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-hero-border pt-3 text-sm">
        <FooterStat label={text.saved} value={formatMoney(summary.saved)} />
        <FooterStat
          label={text.savingsRate}
          value={summary.savingsRate === null ? "—" : `${summary.savingsRate}%`}
        />
      </dl>
    </section>
  );
}

// Where one currency's spending went this month, shown only when there is some
export function SpendingCard({
  card,
  month,
}: {
  card: DashboardCard;
  month: string;
}) {
  const { currency, summary } = card;
  const text = en.dashboard;
  return (
    <section
      aria-labelledby={`spending-${currency} spending-${currency}-currency`}
      className="space-y-2 rounded-2xl border border-border bg-card px-1 py-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-3">
        <h2 id={`spending-${currency}`} className="text-lg font-semibold">
          {text.whereMoneyWent}
        </h2>
        <p
          id={`spending-${currency}-currency`}
          className="text-sm text-muted-foreground"
        >
          {en.currencies[currency]}
        </p>
      </div>
      <ul>
        {summary.byCategory.map((item) => (
          <SpendingRow
            key={item.categoryId ?? "other"}
            item={item}
            month={month}
          />
        ))}
      </ul>
    </section>
  );
}
