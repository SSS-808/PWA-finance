import Link from "next/link";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import type { Goal } from "../domain/calculations";
import { GoalProgress } from "./goal-progress";

function GoalCard({ goal, today }: { goal: Goal; today: string }) {
  return (
    <li className="space-y-2 rounded-lg border border-border px-4 py-4">
      <Link
        href={`/goals/${goal.id}`}
        className="inline-flex min-h-12 items-center text-base font-medium break-words underline underline-offset-4"
      >
        {goal.name}
      </Link>
      <GoalProgress goal={goal} today={today} />
    </li>
  );
}

// Goals as cards; the active list also has the add link, and an empty one says so
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

  return (
    <div className="space-y-4">
      {goals.length === 0 ? (
        <p className="text-xl font-semibold">{en.goals.empty}</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} today={today} />
          ))}
        </ul>
      )}
      <Button asChild className="h-12 w-full text-base">
        <Link href="/goals/new">{en.goals.add}</Link>
      </Button>
    </div>
  );
}
