import type { CurrencyCode, Money } from "@/modules/money";
import type { CurrencySummary } from "./calculations";

// What Home shows for one currency: the total balance now and the chosen month's numbers
export type DashboardCard = {
  currency: CurrencyCode;
  balance: Money;
  summary: CurrencySummary;
};
