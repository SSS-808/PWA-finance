import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { AddLink } from "@/components/shared/add-link";
import { LoadingStatus, Skeleton } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { getProfile, todayIn } from "@/modules/profile";
import {
  TripList,
  TripNotice,
  listTripSpending,
  listTrips,
} from "@/modules/trips";

export default function TripsPage({ searchParams }: PageProps<"/trips">) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <BackLink href="/more" label={en.more.back} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {en.trips.title}
        </h1>
        <AddLink href="/trips/new" label={en.trips.add} />
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            <LoadingStatus />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        }
      >
        <TripsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TripsContent({
  searchParams,
}: {
  searchParams: PageProps<"/trips">["searchParams"];
}) {
  const { notice } = await searchParams;
  const [trips, spent, profile] = await Promise.all([
    listTrips(),
    listTripSpending(),
    getProfile(),
  ]);

  return (
    <div className="space-y-8">
      <TripNotice notice={notice} />
      <TripList trips={trips} spent={spent} today={todayIn(profile.timeZone)} />
    </div>
  );
}
