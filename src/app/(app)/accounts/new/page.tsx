import { en } from "@/messages/en";
import { AccountForm } from "@/modules/accounts";

export default function NewAccountPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.accounts.form.newTitle}
      </h1>
      <AccountForm mode="create" />
    </div>
  );
}
