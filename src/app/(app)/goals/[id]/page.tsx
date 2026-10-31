import { Pencil } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import {
  ArchiveButton,
  ContributionForm,
  ContributionHistory,
  GoalIcon,
  GoalNotice,
  GoalPercent,
  GoalProgress,
  UnarchiveButton,
  getGoal,
  goalProgress,
} from "@/modules/goals";
import { getProfile, todayIn } from "@/modules/profile";

export default function GoalPage({
  params,
  searchParams,
}: PageProps<"/goals/[id]">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/goals" label={en.goals.back} />
      <Suspense>
        <GoalDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function GoalDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/goals/[id]">["params"];
  searchParams: PageProps<"/goals/[id]">["searchParams"];
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const [goal, profile] = await Promise.all([getGoal(id), getProfile()]);
  const today = todayIn(profile.timeZone);
  const progress = goalProgress(goal, today);

  return (
    <div className="space-y-6">
      <GoalNotice notice={notice} />
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <GoalIcon reached={progress.reached} />
          <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight break-words">
            {goal.name}
          </h1>
          <GoalPercent percent={progress.percent} reached={progress.reached} />
        </div>
        <GoalProgress goal={goal} today={today} />
      </div>
      {goal.archived ? null : (
        <ContributionForm goalId={goal.id} currency={goal.target.currency} />
      )}
      <ContributionHistory contributions={goal.contributions} />
      <div className="space-y-3">
        <Button
          asChild
          variant="outline"
          className="h-12 w-full rounded-xl bg-card text-base"
        >
          <Link href={`/goals/${goal.id}/edit`}>
            <Pencil className="size-5" aria-hidden="true" />
            {en.goals.edit}
          </Link>
        </Button>
        {goal.archived ? (
          <UnarchiveButton id={goal.id} />
        ) : (
          <ArchiveButton id={goal.id} />
        )}
      </div>
    </div>
  );
}
