import { ProgressBar } from "@/components/shared/progress-bar";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { monthLabel } from "@/modules/transactions";
import { type Goal, goalProgress } from "../domain/calculations";
import { fill } from "./fill";

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
      <ProgressBar label={goal.name} percent={progress.percent} />
      <p className="text-base text-muted-foreground">{status}</p>
    </>
  );
}
