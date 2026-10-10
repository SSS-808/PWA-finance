import { SubmitButton } from "@/components/shared/submit-button";
import { en } from "@/messages/en";
import { showCategory } from "../server/actions";

export function ShowButton({ id }: { id: string }) {
  return (
    <form action={showCategory.bind(null, id)}>
      <SubmitButton
        label={en.categories.showAgain}
        pendingLabel={en.categories.showAgain}
        variant="outline"
      />
    </form>
  );
}
