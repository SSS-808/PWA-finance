import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { DeleteTripButton, TripForm, getTrip } from "@/modules/trips";

export default function EditTripPage({
  params,
}: PageProps<"/trips/[id]/edit">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/trips" label={en.trips.back} />
      <Suspense
        fallback={
          <>
            <LoadingStatus />
            <FormSkeleton title={en.trips.editTitle} />
          </>
        }
      >
        <EditTripContent params={params} />
      </Suspense>
    </div>
  );
}

async function EditTripContent({
  params,
}: {
  params: PageProps<"/trips/[id]/edit">["params"];
}) {
  const { id } = await params;
  const trip = await getTrip(id);
  return (
    <div className="space-y-6">
      <TripForm
        mode="edit"
        title={en.trips.editTitle}
        id={trip.id}
        name={trip.name}
        startsOn={trip.startsOn}
        endsOn={trip.endsOn}
      />
      <DeleteTripButton id={trip.id} />
    </div>
  );
}
