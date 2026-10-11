import { type Money, money, subtract, zero } from "@/modules/money";

// deadline is "YYYY-MM-DD"
export type Goal = {
  id: string;
  name: string;
  target: Money;
  saved: Money;
  deadline: string | null;
  archived: boolean;
};

export type GoalProgress = {
  percent: number;
  left: Money;
  reached: boolean;
  overdue: boolean;
  monthsLeft: number | null;
  perMonth: Money | null;
};

// Calendar months from today's month through the deadline's month, at least 1; both dates are "YYYY-MM-DD"
function monthsBetween(today: string, deadline: string): number {
  const years = Number(deadline.slice(0, 4)) - Number(today.slice(0, 4));
  const months = Number(deadline.slice(5, 7)) - Number(today.slice(5, 7));
  return Math.max(1, years * 12 + months + 1);
}

export function goalProgress(goal: Goal, today: string): GoalProgress {
  const { target, saved, deadline } = goal;
  const difference = subtract(target, saved);
  const left = difference.minor < 0 ? zero(target.currency) : difference;
  const reached = saved.minor >= target.minor;
  const overdue = deadline !== null && deadline < today && !reached;
  const monthsLeft =
    deadline === null || reached || overdue
      ? null
      : monthsBetween(today, deadline);
  return {
    percent: Math.floor((saved.minor * 100) / target.minor),
    left,
    reached,
    overdue,
    monthsLeft,
    // Rounded up with integer maths so the monthly amounts always reach the target
    perMonth:
      monthsLeft === null
        ? null
        : money(
            Math.floor((left.minor + monthsLeft - 1) / monthsLeft),
            left.currency,
          ),
  };
}

function byDeadline(a: Goal, b: Goal): number {
  if (a.deadline === b.deadline) return 0;
  if (a.deadline === null) return 1;
  if (b.deadline === null) return -1;
  return a.deadline < b.deadline ? -1 : 1;
}

// Active goals first by deadline (soonest first, no deadline last), then by name
export function sortGoals(goals: readonly Goal[]): Goal[] {
  return [...goals].sort(
    (a, b) =>
      Number(a.archived) - Number(b.archived) ||
      byDeadline(a, b) ||
      a.name.localeCompare(b.name, "en") ||
      a.id.localeCompare(b.id),
  );
}
