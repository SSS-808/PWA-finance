import { BackLink } from "@/components/shared/back-link";
import { en } from "@/messages/en";
import { AccountForm } from "@/modules/accounts";

export default function NewAccountPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/accounts" label={en.accounts.detail.back} />
      <AccountForm mode="create" title={en.accounts.form.newTitle} />
    </div>
  );
}
