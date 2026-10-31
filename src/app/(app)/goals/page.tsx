import Link from "next/link";
import { Suspense } from "react";
import { AddLink } from "@/components/shared/add-link";
import { LoadingStatus, Skeleton } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { GoalList, GoalNotice, listGoals } from "@/modules/goals";
import { getProfile, todayIn } from "@/modules/profile";

const toggleClass =
  "flex min-h-11 items-center justify-center text-base font-medium text-muted-foreground underline underline-offset-4";

export default function GoalsPage({ searchParams }: PageProps<"/goals">) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {en.goals.title}
        </h1>
        <AddLink href="/goals/new" label={en.goals.add} />
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            <LoadingStatus />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        }
      >
        <GoalsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function GoalsContent({
  searchParams,
}: {
  searchParams: PageProps<"/goals">["searchParams"];
}) {
  const { notice, archived: showArchivedParam } = await searchParams;
  const [{ active, archived }, profile] = await Promise.all([
    listGoals(),
    getProfile(),
  ]);
  const today = todayIn(profile.timeZone);
  const showArchived = showArchivedParam === "1";

  return (
    <div className="space-y-8">
      <GoalNotice notice={notice} />
      <GoalList goals={active} today={today} />
      {archived.length > 0 ? (
        <div className="space-y-4">
          <Link
            href={showArchived ? "/goals" : "/goals?archived=1"}
            className={toggleClass}
          >
            {showArchived
              ? en.goals.hideArchived
              : en.goals.showArchived.replace(
                  "{count}",
                  String(archived.length),
                )}
          </Link>
          {showArchived ? (
            <GoalList goals={archived} today={today} archived />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
