import { SubmitButton } from "@/components/shared/submit-button";
import { en } from "@/messages/en";
import { unarchiveGoal } from "../server/actions";

export function UnarchiveButton({ id }: { id: string }) {
  return (
    <form action={unarchiveGoal.bind(null, id)}>
      <SubmitButton
        label={en.goals.unarchive}
        pendingLabel={en.goals.unarchive}
        variant="outline"
      />
    </form>
  );
}
