import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { type Money, isCurrencyCode, money } from "@/modules/money";
import {
  type AccountShare,
  type Goal,
  contributionShares,
  sortGoals,
} from "../domain/calculations";

export type Contribution = {
  id: string;
  amount: Money;
  date: string;
  accountId: string | null;
};

// shares cover every contribution, while contributions is only the latest ones
export type GoalDetail = Goal & {
  contributions: Contribution[];
  shares: AccountShare[];
};

export type GoalMoney = {
  accountId: string;
  goalId: string;
  goalName: string;
  amount: Money;
};

type GoalRow = {
  id: string;
  name: string;
  currency: string;
  target_minor: number;
  deadline: string | null;
  archived_at: string | null;
};

const GOAL_COLUMNS = "id, name, currency, target_minor, deadline, archived_at";

const HISTORY_LIMIT = 50;

const idSchema = z.uuid();

function toGoal(row: GoalRow, savedMinor: number | null): Goal {
  // The database checks this value, so anything else is a bug
  if (!isCurrencyCode(row.currency)) {
    throw new Error(`Unexpected goal currency: ${row.currency}`);
  }
  return {
    id: row.id,
    name: row.name,
    target: money(row.target_minor, row.currency),
    saved: money(savedMinor ?? 0, row.currency),
    deadline: row.deadline,
    archived: row.archived_at !== null,
  };
}

// Active and archived goals with what is saved; the view can't be embedded, so they are merged here
export async function listGoals(): Promise<{
  active: Goal[];
  archived: Goal[];
}> {
  await requireUser();
  const supabase = await createClient();
  const [goals, totals] = await Promise.all([
    supabase.from("goals").select(GOAL_COLUMNS),
    supabase.from("goal_totals").select("goal_id, saved_minor"),
  ]);
  if (goals.error) {
    throw new Error("Could not load the goals", { cause: goals.error });
  }
  if (totals.error) {
    throw new Error("Could not load the goals", { cause: totals.error });
  }
  const savedById = new Map(
    totals.data.map((row) => [row.goal_id, row.saved_minor]),
  );
  const all = sortGoals(
    goals.data.map((row) => toGoal(row, savedById.get(row.id) ?? null)),
  );
  return {
    active: all.filter((goal) => !goal.archived),
    archived: all.filter((goal) => goal.archived),
  };
}

// One goal with what is saved and its latest contributions; a bad id or someone else's goal is a 404
export async function getGoal(id: string): Promise<GoalDetail> {
  await requireUser();
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [goal, total, rows] = await Promise.all([
    supabase.from("goals").select(GOAL_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("goal_totals")
      .select("saved_minor")
      .eq("goal_id", id)
      .maybeSingle(),
    supabase
      .from("goal_contributions")
      .select("id, amount_minor, contributed_on, account_id")
      .eq("goal_id", id)
      .order("contributed_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (goal.error) {
    throw new Error("Could not load the goals", { cause: goal.error });
  }
  if (total.error) {
    throw new Error("Could not load the goals", { cause: total.error });
  }
  if (rows.error) {
    throw new Error("Could not load the goals", { cause: rows.error });
  }
  if (!goal.data) notFound();

  const detail = toGoal(goal.data, total.data?.saved_minor ?? null);
  const all = rows.data.map((row) => ({
    id: row.id,
    amount: money(row.amount_minor, detail.target.currency),
    date: row.contributed_on,
    accountId: row.account_id,
  }));
  return {
    ...detail,
    contributions: all.slice(0, HISTORY_LIMIT),
    shares: contributionShares(all),
  };
}

// The money each active goal holds in each account, largest first; money that is not in an account is left out
export async function listGoalMoneyByAccount(): Promise<GoalMoney[]> {
  await requireUser();
  const supabase = await createClient();
  const [goals, contributions] = await Promise.all([
    supabase.from("goals").select("id, name, currency").is("archived_at", null),
    supabase
      .from("goal_contributions")
      .select("goal_id, account_id, amount_minor")
      .not("account_id", "is", null),
  ]);
  if (goals.error) {
    throw new Error("Could not load the goals", { cause: goals.error });
  }
  if (contributions.error) {
    throw new Error("Could not load the goal money", {
      cause: contributions.error,
    });
  }

  const result: GoalMoney[] = [];
  for (const goal of goals.data) {
    // The database checks this value, so anything else is a bug
    if (!isCurrencyCode(goal.currency)) {
      throw new Error(`Unexpected goal currency: ${goal.currency}`);
    }
    const currency = goal.currency;
    const shares = contributionShares(
      contributions.data
        .filter((row) => row.goal_id === goal.id)
        .map((row) => ({
          accountId: row.account_id,
          amount: money(row.amount_minor, currency),
        })),
    );
    for (const { accountId, amount } of shares) {
      if (accountId !== null && amount.minor > 0) {
        result.push({
          accountId,
          goalId: goal.id,
          goalName: goal.name,
          amount,
        });
      }
    }
  }
  return result.sort(
    (a, b) =>
      b.amount.minor - a.amount.minor ||
      a.goalName.localeCompare(b.goalName, "en") ||
      a.goalId.localeCompare(b.goalId),
  );
}
