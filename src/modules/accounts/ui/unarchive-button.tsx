import { SubmitButton } from "@/components/shared/submit-button";
import { en } from "@/messages/en";
import { unarchiveAccount } from "../server/actions";

export function UnarchiveButton({ id }: { id: string }) {
  return (
    <form action={unarchiveAccount.bind(null, id)}>
      <SubmitButton
        label={en.accounts.detail.unarchive}
        pendingLabel={en.accounts.detail.unarchive}
        variant="outline"
      />
    </form>
  );
}
