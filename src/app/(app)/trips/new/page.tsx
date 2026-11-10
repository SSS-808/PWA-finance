import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { getProfile, todayIn } from "@/modules/profile";
import { TripForm } from "@/modules/trips";

export default function NewTripPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/trips" label={en.trips.back} />
      <Suspense
        fallback={
          <>
            <LoadingStatus />
            <FormSkeleton title={en.trips.newTitle} />
          </>
        }
      >
        <NewTripContent />
      </Suspense>
    </div>
  );
}

async function NewTripContent() {
  const profile = await getProfile();
  return (
    <TripForm
      mode="create"
      title={en.trips.newTitle}
      today={todayIn(profile.timeZone)}
    />
  );
}
