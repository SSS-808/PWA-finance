import Link from "next/link";
import {
  CategoryIcon,
  categoryBarClass,
} from "@/components/shared/category-icon";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { baseFilters, filtersToQuery } from "@/modules/transactions";
import type { CategorySpending } from "../domain/calculations";
import type { DashboardCard } from "../domain/types";

const rowClass = "flex min-h-12 items-center gap-3 rounded-lg px-3 py-2";

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wider text-hero-muted uppercase">
        {label}
      </dt>
      <dd className="text-lg font-semibold break-words tabular-nums">
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
      <CategoryIcon icon={item.icon} color={item.color} />
      <span className="min-w-0 flex-1">
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
            className={cn(
              "block h-full rounded-full",
              categoryBarClass(item.color),
            )}
            style={{ width: `${item.share * 100}%` }}
          />
        </span>
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

// One currency in solid emerald: the total balance and the month's numbers
export function CurrencyCard({ card }: { card: DashboardCard }) {
  const { currency, balance, summary } = card;
  const text = en.dashboard;
  return (
    <section
      aria-labelledby={`dashboard-${currency}`}
      className="space-y-4 rounded-2xl bg-hero p-5 text-hero-foreground"
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm text-hero-muted">
          <h2 id={`dashboard-${currency}`}>{en.currencies[currency]}</h2>
          <span aria-hidden="true">·</span>
          <span>{text.totalBalance}</span>
        </div>
        <p className="text-4xl font-semibold tracking-tight break-words tabular-nums">
          {formatMoney(balance)}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <HeroStat
          label={text.income}
          value={formatMoney(summary.income, { signDisplay: "exceptZero" })}
        />
        <HeroStat label={text.spending} value={formatMoney(summary.spending)} />
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
