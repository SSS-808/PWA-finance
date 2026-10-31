import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import {
  MAX_SEARCH_LENGTH,
  TYPE_FILTERS,
  baseFilters,
  filtersToQuery,
  nextMonth,
  previousMonth,
  type HistoryFilters,
} from "../domain/filters";
import type { CategoryOption } from "../domain/types";

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const linkClass =
  "inline-flex min-h-12 items-center rounded-lg px-3 text-base underline-offset-4 hover:underline";

const arrowClass =
  "inline-flex size-11 items-center justify-center rounded-full hover:bg-muted";

// A label like "October 2026"; the month is a plain calendar month, so no time zone shift
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function historyHref(filters: HistoryFilters): string {
  return `/transactions?${filtersToQuery(filters)}`;
}

// Hidden categories stay in the filter, because old entries still use them
function optionLabel(category: CategoryOption): string {
  return category.hidden
    ? `${category.name} ${en.categories.hiddenSuffix}`
    : category.name;
}

function typeLabel(type: (typeof TYPE_FILTERS)[number]): string {
  return type === "other"
    ? en.transactions.filters.typeOther
    : en.transactions.kinds[type];
}

function MonthBar({
  filters,
  currentMonth,
}: {
  filters: HistoryFilters;
  currentMonth: string;
}) {
  const { month } = filters;
  return (
    <nav
      aria-label={en.transactions.filters.monthLabel}
      className="flex min-h-13 items-center justify-between rounded-full border border-border bg-card p-1"
    >
      {month ? (
        <>
          <Link
            href={historyHref({ ...filters, month: previousMonth(month) })}
            aria-label={en.transactions.filters.previousMonth}
            className={arrowClass}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          <span className="text-base font-semibold">{monthLabel(month)}</span>
          {nextMonth(month) <= currentMonth ? (
            <Link
              href={historyHref({ ...filters, month: nextMonth(month) })}
              aria-label={en.transactions.filters.nextMonth}
              className={arrowClass}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </Link>
          ) : (
            <span className="size-11" aria-hidden="true" />
          )}
        </>
      ) : (
        <span className="flex-1 text-center text-base font-semibold">
          {en.transactions.filters.allMonths}
        </span>
      )}
    </nav>
  );
}

// The month bar and the filter form; the form is a plain GET, so it works without JavaScript
export function HistoryFilterBar({
  filters,
  today,
  count,
  accounts,
  expenseCategories,
  incomeCategories,
}: {
  filters: HistoryFilters;
  today: string;
  count: number;
  accounts: readonly { id: string; name: string }[];
  expenseCategories: readonly CategoryOption[];
  incomeCategories: readonly CategoryOption[];
}) {
  const uid = useId();
  const text = en.transactions.filters;
  const currentMonth = today.slice(0, 7);
  const activeCount = [
    filters.accountId,
    filters.categoryId,
    filters.type,
  ].filter(Boolean).length;
  return (
    <div className="space-y-3">
      <MonthBar filters={filters} currentMonth={currentMonth} />
      <form
        // A new key per filter set, so a half-typed search is dropped when the filters change by link
        key={filtersToQuery(filters)}
        method="get"
        action="/transactions"
      >
        <input type="hidden" name="month" value={filters.month ?? "all"} />
        <div className="relative flex gap-2">
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-card px-3 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <Search className="size-5 shrink-0" aria-hidden="true" />
            <span className="sr-only">{text.search}</span>
            <input
              type="search"
              name="q"
              autoComplete="off"
              maxLength={MAX_SEARCH_LENGTH}
              defaultValue={filters.q}
              placeholder={text.search}
              className="h-full w-full min-w-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <details className="group">
            <summary className="flex h-12 cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-card px-4 text-base font-medium outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal className="size-5" aria-hidden="true" />
              {text.filters}
              {activeCount > 0 ? (
                <span className="rounded-full bg-primary px-2 text-sm text-primary-foreground">
                  {activeCount}
                </span>
              ) : null}
            </summary>
            <div className="absolute inset-x-0 top-full z-20 mt-2 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
              <div className="space-y-2">
                <Label htmlFor={`${uid}-account`} className="text-base">
                  {text.account}
                </Label>
                <select
                  id={`${uid}-account`}
                  name="account"
                  className={selectClass}
                  defaultValue={filters.accountId ?? ""}
                >
                  <option value="">{text.allAccounts}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${uid}-category`} className="text-base">
                  {text.category}
                </Label>
                <select
                  id={`${uid}-category`}
                  name="category"
                  className={selectClass}
                  defaultValue={filters.categoryId ?? ""}
                >
                  <option value="">{text.allCategories}</option>
                  <optgroup label={en.transactions.kinds.expense}>
                    {expenseCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {optionLabel(category)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={en.transactions.kinds.income}>
                    {incomeCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {optionLabel(category)}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${uid}-type`} className="text-base">
                  {text.type}
                </Label>
                <select
                  id={`${uid}-type`}
                  name="type"
                  className={selectClass}
                  defaultValue={filters.type ?? ""}
                >
                  <option value="">{text.allTypes}</option>
                  {TYPE_FILTERS.map((type) => (
                    <option key={type} value={type}>
                      {typeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" className="h-12 flex-1 text-base">
                  {text.apply}
                </Button>
                <Link
                  href={historyHref(baseFilters(filters.month))}
                  className={linkClass}
                >
                  {text.clear}
                </Link>
              </div>
            </div>
          </details>
        </div>
      </form>
      <div className="flex min-h-11 items-center justify-between gap-3 px-1">
        {count > 0 ? (
          <p className="text-sm text-muted-foreground">
            {count === 1
              ? text.countOne
              : text.count.replace("{n}", String(count))}
          </p>
        ) : null}
        <Link
          href={historyHref({
            ...filters,
            month: filters.month ? null : currentMonth,
          })}
          className="ml-auto inline-flex min-h-11 items-center text-base font-medium text-primary"
        >
          {filters.month ? text.allMonths : text.thisMonth}
        </Link>
      </div>
    </div>
  );
}
