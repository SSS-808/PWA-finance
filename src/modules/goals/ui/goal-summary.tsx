import Link from "next/link";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import type { Goal } from "../domain/calculations";
import { GoalProgress } from "./goal-progress";

// The first three active goals for Home, or the plain Goals button when there are none
export function GoalSummary({
  goals,
  today,
}: {
  goals: readonly Goal[];
  today: string;
}) {
  if (goals.length === 0) {
    return (
      <Button asChild variant="outline" className="h-12 w-full text-base">
        <Link href="/goals">{en.goals.title}</Link>
      </Button>
    );
  }

  return (
    <section aria-labelledby="home-goals" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="home-goals" className="text-xl font-semibold">
          {en.goals.title}
        </h2>
        <Link
          href="/goals"
          className="inline-flex min-h-12 items-center rounded-lg px-3 text-base underline-offset-4 hover:underline"
        >
          {en.goals.seeAll}
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {goals.slice(0, 3).map((goal) => (
          <li key={goal.id} className="space-y-2 py-3">
            <Link
              href={`/goals/${goal.id}`}
              className="inline-flex min-h-12 items-center text-base font-medium break-words underline underline-offset-4"
            >
              {goal.name}
            </Link>
            <GoalProgress goal={goal} today={today} />
          </li>
        ))}
      </ul>
    </section>
  );
}
