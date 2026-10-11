import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { en } from "@/messages/en";
import { GoalForm, getGoal } from "@/modules/goals";
import { toDecimalString } from "@/modules/money";

export default function EditGoalPage({
  params,
}: PageProps<"/goals/[id]/edit">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Link
        href="/goals"
        className="inline-flex min-h-12 items-center gap-2 text-base text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {en.goals.back}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.goals.editTitle}
      </h1>
      <Suspense>
        <EditGoalContent params={params} />
      </Suspense>
    </div>
  );
}

async function EditGoalContent({
  params,
}: {
  params: PageProps<"/goals/[id]/edit">["params"];
}) {
  const { id } = await params;
  const goal = await getGoal(id);
  return (
    <GoalForm
      mode="edit"
      id={goal.id}
      currency={goal.target.currency}
      name={goal.name}
      target={toDecimalString(goal.target)}
      deadline={goal.deadline ?? ""}
    />
  );
}
