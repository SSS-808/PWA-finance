import { Pencil } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import {
  HeroSkeleton,
  LoadingStatus,
  Skeleton,
} from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { isZero } from "@/modules/money";
import { getProfile, todayIn } from "@/modules/profile";
import {
  LabelEntriesCard,
  TripNotice,
  TripSpending,
  TripSummary,
  countUnlabelled,
  getTripPage,
} from "@/modules/trips";

export default function TripPage({
  params,
  searchParams,
}: PageProps<"/trips/[id]">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <BackLink href="/trips" label={en.trips.back} />
            <LoadingStatus />
            <HeroSkeleton />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        }
      >
        <TripDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TripDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/trips/[id]">["params"];
  searchParams: PageProps<"/trips/[id]">["searchParams"];
}) {
  const { id } = await params;
  const { notice, count } = await searchParams;
  const [{ trip, summaries, entries }, profile] = await Promise.all([
    getTripPage(id),
    getProfile(),
  ]);
  const unlabelled = await countUnlabelled(trip);
  const spending = summaries.filter((summary) => !isZero(summary.spending));

  return (
    <div className="space-y-6">
      <TripNotice notice={notice} count={count} name={trip.name} />
      <div className="flex items-center justify-between gap-3">
        <BackLink href="/trips" label={en.trips.back} />
        <Button
          asChild
          variant="outline"
          className="h-11 shrink-0 rounded-full bg-card px-4 text-base"
        >
          <Link href={`/trips/${trip.id}/edit`}>
            <Pencil className="size-5" aria-hidden="true" />
            {en.trips.edit}
          </Link>
        </Button>
      </div>
      <TripSummary
        trip={trip}
        totals={summaries}
        entries={entries}
        today={todayIn(profile.timeZone)}
      />
      {unlabelled > 0 ? (
        <LabelEntriesCard
          tripId={trip.id}
          name={trip.name}
          count={unlabelled}
        />
      ) : null}
      {spending.map((summary) => (
        <TripSpending
          key={summary.currency}
          tripId={trip.id}
          spending={summary.spending}
          items={summary.byCategory}
        />
      ))}
      {entries > 0 ? (
        <Link
          href={`/transactions?trip=${trip.id}&month=all`}
          className="inline-flex min-h-11 items-center text-base font-medium text-primary"
        >
          {entries === 1
            ? en.trips.detail.seeAllOne
            : en.trips.detail.seeAll.replace("{n}", String(entries))}
        </Link>
      ) : null}
    </div>
  );
}
