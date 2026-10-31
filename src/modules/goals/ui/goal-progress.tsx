import { ProgressBar } from "@/components/shared/progress-bar";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { monthLabel } from "@/modules/transactions";
import { type Goal, goalProgress } from "../domain/calculations";
import { fill } from "./fill";

// The percent of the target that is saved, capped at 100; green once the goal is reached
export function GoalPercent({
  percent,
  reached,
}: {
  percent: number;
  reached: boolean;
}) {
  return (
    <span
      className={cn(
        "shrink-0 text-base font-semibold tabular-nums",
        reached && "text-income",
      )}
    >
      {Math.min(percent, 100)}%
    </span>
  );
}

// The saved amount, the bar and one status line; today is "YYYY-MM-DD" in the person's time zone
export function GoalProgress({ goal, today }: { goal: Goal; today: string }) {
  const progress = goalProgress(goal, today);
  let status: string;
  if (progress.reached) {
    status = en.goals.reached;
  } else if (progress.overdue) {
    status = en.goals.overdue;
  } else if (progress.perMonth !== null && goal.deadline !== null) {
    status = fill(en.goals.perMonth, {
      amount: formatMoney(progress.perMonth),
      month: monthLabel(goal.deadline.slice(0, 7)),
    });
  } else {
    status = fill(en.goals.left, { amount: formatMoney(progress.left) });
  }
  return (
    <>
      <p className="text-base tabular-nums">
        {fill(en.goals.of, {
          saved: formatMoney(goal.saved),
          target: formatMoney(goal.target),
        })}
      </p>
      <ProgressBar
        label={goal.name}
        percent={progress.percent}
        fillClass={progress.reached ? "bg-income" : undefined}
      />
      <p
        className={cn(
          "text-base",
          progress.reached
            ? "font-medium text-income"
            : "text-muted-foreground",
        )}
      >
        {status}
      </p>
    </>
  );
}
