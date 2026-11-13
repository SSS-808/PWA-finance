import type { CurrencyCode } from "@/modules/money";
import { DEFAULT_PERIOD, PERIODS, type Period } from "./types";

// The period from the URL; anything unexpected falls back to the default
export function parsePeriod(raw: unknown): Period {
  return PERIODS.find((period) => String(period) === raw) ?? DEFAULT_PERIOD;
}

// The currency from the URL if it has entries; otherwise the first one in use
export function pickCurrency(
  raw: unknown,
  used: readonly CurrencyCode[],
): CurrencyCode | null {
  return used.find((code) => code === raw) ?? used[0] ?? null;
}
