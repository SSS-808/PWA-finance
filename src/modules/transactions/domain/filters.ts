import { z } from "zod";
import type { TransactionKind } from "./types";

export const MAX_SEARCH_LENGTH = 100;

// "other" is the starting amounts and balance fixes
export const TYPE_FILTERS = ["expense", "income", "transfer", "other"] as const;

export type TypeFilter = (typeof TYPE_FILTERS)[number];

export const KINDS_BY_TYPE: Record<TypeFilter, readonly TransactionKind[]> = {
  expense: ["expense"],
  income: ["income"],
  transfer: ["transfer"],
  other: ["opening_balance", "adjustment"],
};

// month is YYYY-MM, or null for every month; q is empty when there is no search
export type HistoryFilters = {
  month: string | null;
  accountId: string | null;
  categoryId: string | null;
  type: TypeFilter | null;
  q: string;
};

export type RawParams = Record<string, string | string[] | undefined>;

const monthSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const idSchema = z.uuid();
const typeSchema = z.enum(TYPE_FILTERS);
const searchSchema = z.string().trim().max(MAX_SEARCH_LENGTH);

function valid<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

// A bad value is ignored, never an error; today is YYYY-MM-DD in the person's time zone
export function parseFilters(raw: RawParams, today: string): HistoryFilters {
  const month =
    raw.month === "all"
      ? null
      : (valid(monthSchema, raw.month) ?? today.slice(0, 7));
  return {
    month,
    accountId: valid(idSchema, raw.account),
    categoryId: valid(idSchema, raw.category),
    type: valid(typeSchema, raw.type),
    q: valid(searchSchema, raw.q) ?? "",
  };
}

// No filter at all except the month
export function baseFilters(month: string | null): HistoryFilters {
  return { month, accountId: null, categoryId: null, type: null, q: "" };
}

function shiftMonth(month: string, delta: number): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1 + delta;
  return new Date(Date.UTC(year, index, 1)).toISOString().slice(0, 7);
}

export function previousMonth(month: string): string {
  return shiftMonth(month, -1);
}

export function nextMonth(month: string): string {
  return shiftMonth(month, 1);
}

// The first day of the month and the first day after it
export function monthRange(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${nextMonth(month)}-01` };
}

// Makes %, _ and \ match themselves in a LIKE pattern
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

// The URL query that parseFilters reads back
export function filtersToQuery(filters: HistoryFilters): string {
  const params = new URLSearchParams({ month: filters.month ?? "all" });
  if (filters.accountId) params.set("account", filters.accountId);
  if (filters.categoryId) params.set("category", filters.categoryId);
  if (filters.type) params.set("type", filters.type);
  if (filters.q) params.set("q", filters.q);
  return params.toString();
}
