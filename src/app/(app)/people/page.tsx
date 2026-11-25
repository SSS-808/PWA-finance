import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { LoadingStatus, Skeleton } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { PeopleNotice, PeopleOverview, listPeople } from "@/modules/people";
import { getProfile, todayIn } from "@/modules/profile";

export default function PeoplePage({ searchParams }: PageProps<"/people">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/more" label={en.more.back} />
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.people.title}
      </h1>
      <Suspense
        fallback={
          <div className="space-y-3">
            <LoadingStatus />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-12 rounded-full" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        }
      >
        <PeopleContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PeopleContent({
  searchParams,
}: {
  searchParams: PageProps<"/people">["searchParams"];
}) {
  const { notice } = await searchParams;
  const [people, profile] = await Promise.all([listPeople(), getProfile()]);
  return (
    <>
      <PeopleNotice notice={notice} />
      <PeopleOverview people={people} today={todayIn(profile.timeZone)} />
    </>
  );
}
