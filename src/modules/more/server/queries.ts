import "server-only";
import { getBudgetMonth } from "@/modules/budgets";
import { goalProgress, listGoals } from "@/modules/goals";
import { getProfile, todayIn } from "@/modules/profile";
import { groupTrips, listTrips } from "@/modules/trips";
import {
  type BudgetsStatus,
  type GoalsStatus,
  type TripsStatus,
  budgetsStatus,
  goalsStatus,
  tripsStatus,
} from "../domain/calculations";

export type MoreStatus = {
  budgets: BudgetsStatus;
  goals: GoalsStatus;
  trips: TripsStatus;
};

// The short status line of each tile on the More page
export async function getMoreStatus(): Promise<MoreStatus> {
  const profile = await getProfile();
  const today = todayIn(profile.timeZone);
  const [budgetMonth, goals, trips] = await Promise.all([
    getBudgetMonth(today.slice(0, 7)),
    listGoals(),
    listTrips(),
  ]);
  const lines = budgetMonth.groups.flatMap((group) => group.lines);
  const over = lines.filter((line) => line.left.minor < 0).length;
  const first = goals.active[0];
  const grouped = groupTrips(trips, today);
  return {
    budgets: budgetsStatus(lines.length, over),
    goals: goalsStatus(
      goals.active.length,
      first === undefined ? 0 : goalProgress(first, today).percent,
    ),
    trips: tripsStatus(
      trips.length,
      grouped.now[0]?.name ?? null,
      grouped.upcoming[0]?.name ?? null,
    ),
  };
}
