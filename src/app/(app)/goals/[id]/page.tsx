import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import {
  ArchiveButton,
  ContributionForm,
  ContributionHistory,
  GoalNotice,
  GoalProgress,
  UnarchiveButton,
  getGoal,
} from "@/modules/goals";
import { getProfile, todayIn } from "@/modules/profile";

export default function GoalPage({
  params,
  searchParams,
}: PageProps<"/goals/[id]">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Link
        href="/goals"
        className="inline-flex min-h-12 items-center gap-2 text-base text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {en.goals.back}
      </Link>
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

  return (
    <div className="space-y-6">
      <GoalNotice notice={notice} />
      <h1 className="text-3xl font-semibold tracking-tight break-words">
        {goal.name}
      </h1>
      <div className="space-y-2">
        <GoalProgress goal={goal} today={todayIn(profile.timeZone)} />
      </div>
      {goal.archived ? null : (
        <ContributionForm goalId={goal.id} currency={goal.target.currency} />
      )}
      <ContributionHistory contributions={goal.contributions} />
      <div className="space-y-3">
        <Button asChild variant="outline" className="h-12 w-full text-base">
          <Link href={`/goals/${goal.id}/edit`}>{en.goals.edit}</Link>
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
