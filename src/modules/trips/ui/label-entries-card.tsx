import { SubmitButton } from "@/components/shared/submit-button";
import { en } from "@/messages/en";
import { labelTripEntries } from "../server/actions";

// Offers one tap to give the trip to the money in and out of its days that has none
export function LabelEntriesCard({
  tripId,
  name,
  count,
}: {
  tripId: string;
  name: string;
  count: number;
}) {
  return (
    <form
      action={labelTripEntries.bind(null, tripId)}
      className="space-y-3 rounded-2xl border border-border bg-card p-4"
    >
      <p className="text-base">
        {count === 1
          ? en.trips.detail.unlabelledOne
          : en.trips.detail.unlabelled.replace("{n}", String(count))}
      </p>
      <SubmitButton
        label={en.trips.detail.addThem.replace("{name}", () => name)}
        pendingLabel={en.trips.detail.adding}
      />
    </form>
  );
}
