import Link from "next/link";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import {
  baseFilters,
  filtersToQuery,
  monthLabel,
} from "@/modules/transactions";
import type { CategorySpending } from "../domain/calculations";
import type { DashboardCard } from "../domain/types";

const rowClass = "block min-h-12 rounded-lg px-3 py-2";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium break-words tabular-nums">
        {value}
      </dd>
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

// One currency: the total balance, the month's numbers and where the spending went
export function CurrencyCard({
  card,
  month,
}: {
  card: DashboardCard;
  month: string;
}) {
  const { currency, balance, summary } = card;
  const text = en.dashboard;
  return (
    <section
      aria-labelledby={`dashboard-${currency}`}
      className="space-y-5 rounded-lg border border-border px-4 py-5"
    >
      <div className="space-y-1">
        <h2 id={`dashboard-${currency}`} className="text-xl font-semibold">
          {en.currencies[currency]}
        </h2>
        <p className="text-sm text-muted-foreground">{text.totalBalance}</p>
        <p className="text-3xl font-semibold tracking-tight break-words tabular-nums">
          {formatMoney(balance)}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat
          label={text.income}
          value={formatMoney(summary.income, { signDisplay: "exceptZero" })}
        />
        <Stat label={text.spending} value={formatMoney(summary.spending)} />
        <Stat label={text.saved} value={formatMoney(summary.saved)} />
        <Stat
          label={text.savingsRate}
          value={summary.savingsRate === null ? "—" : `${summary.savingsRate}%`}
        />
      </dl>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{text.whereMoneyWent}</h3>
        {summary.byCategory.length > 0 ? (
          <ul>
            {summary.byCategory.map((item) => (
              <SpendingRow
                key={item.categoryId ?? "other"}
                item={item}
                month={month}
              />
            ))}
          </ul>
        ) : (
          <p className="text-base text-muted-foreground">
            {text.noSpending.replace("{month}", monthLabel(month))}
          </p>
        )}
      </div>
    </section>
  );
}
