import Link from "next/link";
import { en } from "@/messages/en";
import { type Goal, goalProgress } from "../domain/calculations";
import { GoalIcon } from "./goal-icon";
import { GoalPercent, GoalProgress } from "./goal-progress";

function GoalCard({ goal, today }: { goal: Goal; today: string }) {
  const progress = goalProgress(goal, today);
  return (
    <li>
      <Link
        href={`/goals/${goal.id}`}
        className="block space-y-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted"
      >
        <div className="flex items-center gap-3">
          <GoalIcon reached={progress.reached} />
          <span className="min-w-0 flex-1 text-base font-semibold break-words">
            {goal.name}
          </span>
          <GoalPercent percent={progress.percent} reached={progress.reached} />
        </div>
        <GoalProgress goal={goal} today={today} />
      </Link>
    </li>
  );
}

// Goals as cards; an empty active list says so, and the header pill adds a goal
export function GoalList({
  goals,
  today,
  archived = false,
}: {
  goals: readonly Goal[];
  today: string;
  archived?: boolean;
}) {
  if (archived) {
    return (
      <section aria-labelledby="goals-archived" className="space-y-3">
        <h2 id="goals-archived" className="text-xl font-semibold">
          {en.goals.archivedTitle}
        </h2>
        <ul className="space-y-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} today={today} />
          ))}
        </ul>
      </section>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card px-5 py-6">
        <p className="text-xl font-semibold">{en.goals.empty}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} today={today} />
      ))}
    </ul>
  );
}
