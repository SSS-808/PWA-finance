export type BudgetsStatus =
  { kind: "none" } | { kind: "ok" } | { kind: "over"; count: number };

export type GoalsStatus =
  | { kind: "none" }
  | { kind: "one"; percent: number }
  | { kind: "many"; count: number };

export type TripsStatus =
  | { kind: "none" }
  | { kind: "now"; name: string }
  | { kind: "next"; name: string }
  | { kind: "one" }
  | { kind: "many"; count: number };

// Budgets of the current month: how many lines there are and how many are over their limit
export function budgetsStatus(lines: number, over: number): BudgetsStatus {
  if (lines === 0) return { kind: "none" };
  if (over > 0) return { kind: "over", count: over };
  return { kind: "ok" };
}

// Active goals; percent is the first goal's progress, shown only when there is exactly one
export function goalsStatus(count: number, firstPercent: number): GoalsStatus {
  if (count === 0) return { kind: "none" };
  if (count === 1) return { kind: "one", percent: firstPercent };
  return { kind: "many", count };
}

// A trip that is on wins, then the next one coming up, then the plain count
export function tripsStatus(
  total: number,
  nowName: string | null,
  nextName: string | null,
): TripsStatus {
  if (nowName !== null) return { kind: "now", name: nowName };
  if (nextName !== null) return { kind: "next", name: nextName };
  if (total === 0) return { kind: "none" };
  if (total === 1) return { kind: "one" };
  return { kind: "many", count: total };
}
