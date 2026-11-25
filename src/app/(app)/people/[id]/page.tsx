import Link from "next/link";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { LoadingStatus, Skeleton } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import {
  HistoryList,
  JarCard,
  PeopleNotice,
  getPersonPage,
  openJars,
} from "@/modules/people";
import { getProfile, todayIn } from "@/modules/profile";

export default function PersonPage({
  params,
  searchParams,
}: PageProps<"/people/[id]">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Suspense
        fallback={
          <div className="space-y-4">
            <BackLink href="/people" label={en.people.back} />
            <LoadingStatus />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        }
      >
        <PersonContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PersonContent({
  params,
  searchParams,
}: {
  params: PageProps<"/people/[id]">["params"];
  searchParams: PageProps<"/people/[id]">["searchParams"];
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const [{ person, entries }, profile] = await Promise.all([
    getPersonPage(id),
    getProfile(),
  ]);
  const today = todayIn(profile.timeZone);

  return (
    <div className="space-y-6">
      <PeopleNotice notice={notice} />
      <div className="flex items-center justify-between gap-3">
        <BackLink href="/people" label={en.people.back} />
        <Link
          href={`/people/${person.id}/edit`}
          className="inline-flex min-h-11 items-center text-base font-medium text-primary"
        >
          {en.people.edit}
        </Link>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight break-words">
        {person.name}
      </h1>
      {openJars(person).map((jar) => (
        <JarCard
          key={jar.id}
          personId={person.id}
          personName={person.name}
          jar={jar}
          today={today}
        />
      ))}
      <HistoryList personId={person.id} entries={entries} today={today} />
    </div>
  );
}
