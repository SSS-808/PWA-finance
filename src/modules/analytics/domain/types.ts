import type { Money } from "@/modules/money";

export const PERIODS = [3, 6, 12] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = 6;

// Averages and the cards built on them wait for this many counted months
export const MIN_FULL_MONTHS = 2;
export const BIGGEST_COUNT = 5;

export type CategoryInfo = { name: string; icon: string; color: string };

// income and spending are positive
export type MonthTotals = { month: string; income: Money; spending: Money };

// One income or expense as a positive amount, with its month (YYYY-MM)
export type CategoryRow = {
  month: string;
  categoryId: string | null;
  amount: Money;
};

export type NormalMonth = {
  months: number;
  income: Money;
  spending: Money;
  kept: Money;
};

// categoryId null is the "Other" bucket: name "", icon "ellipsis", color "gray"
export type UsualCategory = {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  average: Money;
  byMonth: Money[];
};

export type IncomeSource = {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  amount: Money;
  share: number;
};

// amount is positive; date is YYYY-MM-DD
export type ExpenseItem = {
  id: string;
  date: string;
  note: string | null;
  categoryId: string | null;
  accountId: string;
  amount: Money;
};

export type BudgetEntry = {
  month: string;
  categoryId: string;
  budget: Money;
};

export type BudgetMonthResult = "kept" | "over" | "none";

export type BudgetRecord = {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  budget: Money;
  months: BudgetMonthResult[];
  kept: number;
  counted: number;
};
