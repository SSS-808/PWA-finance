import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const linkClass =
  "inline-flex min-h-12 items-center rounded-lg px-3 text-base underline-offset-4 hover:underline";

const arrowClass =
  "inline-flex size-12 items-center justify-center rounded-lg hover:bg-muted";

// A label like "October 2026"; the month is a plain calendar month, so no time zone shift
function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

function historyHref(filters: HistoryFilters): string {
  return `/transactions?${filtersToQuery(filters)}`;
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
      className="flex flex-wrap items-center gap-x-1"
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
          <span className="min-w-36 text-center text-base font-medium">
            {monthLabel(month)}
          </span>
          {nextMonth(month) <= currentMonth ? (
            <Link
              href={historyHref({ ...filters, month: nextMonth(month) })}
              aria-label={en.transactions.filters.nextMonth}
              className={arrowClass}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </Link>
          ) : (
            <span className="size-12" aria-hidden="true" />
          )}
          <Link
            href={historyHref({ ...filters, month: null })}
            className={`${linkClass} ml-auto`}
          >
            {en.transactions.filters.allMonths}
          </Link>
        </>
      ) : (
        <>
          <span className="px-3 text-base font-medium">
            {en.transactions.filters.allMonths}
          </span>
          <Link
            href={historyHref({ ...filters, month: currentMonth })}
            className={`${linkClass} ml-auto`}
          >
            {en.transactions.filters.thisMonth}
          </Link>
        </>
      )}
    </nav>
  );
}

// The month bar and the filter form; the form is a plain GET, so it works without JavaScript
export function HistoryFilterBar({
  filters,
  today,
  accounts,
  expenseCategories,
  incomeCategories,
}: {
  filters: HistoryFilters;
  today: string;
  accounts: readonly { id: string; name: string }[];
  expenseCategories: readonly CategoryOption[];
  incomeCategories: readonly CategoryOption[];
}) {
  const uid = useId();
  const text = en.transactions.filters;
  return (
    <div className="space-y-3">
      <MonthBar filters={filters} currentMonth={today.slice(0, 7)} />
      <form
        // A new key per filter set, so a half-typed search is dropped when the filters change by link
        key={filtersToQuery(filters)}
        method="get"
        action="/transactions"
        className="space-y-3"
      >
        <input type="hidden" name="month" value={filters.month ?? "all"} />
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
                  {category.name}
                </option>
              ))}
            </optgroup>
            <optgroup label={en.transactions.kinds.income}>
              {incomeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
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
        <div className="space-y-2">
          <Label htmlFor={`${uid}-q`} className="text-base">
            {text.search}
          </Label>
          <Input
            id={`${uid}-q`}
            type="search"
            name="q"
            autoComplete="off"
            maxLength={MAX_SEARCH_LENGTH}
            className="h-12 text-base"
            defaultValue={filters.q}
          />
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
      </form>
    </div>
  );
}
