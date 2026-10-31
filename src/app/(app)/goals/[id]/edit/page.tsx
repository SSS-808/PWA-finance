import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { GoalForm, getGoal } from "@/modules/goals";
import { toDecimalString } from "@/modules/money";

export default function EditGoalPage({
  params,
}: PageProps<"/goals/[id]/edit">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/goals" label={en.goals.back} />
      <Suspense
        fallback={
          <>
            <LoadingStatus />
            <FormSkeleton title={en.goals.editTitle} />
          </>
        }
      >
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
      title={en.goals.editTitle}
      id={goal.id}
      currency={goal.target.currency}
      name={goal.name}
      target={toDecimalString(goal.target)}
      deadline={goal.deadline ?? ""}
    />
  );
}
