import { Suspense } from "react";
import { en } from "@/messages/en";
import { AccountForm, displayBalance, getAccount } from "@/modules/accounts";
import { isZero, toDecimalString } from "@/modules/money";

export default function EditAccountPage({
  params,
}: PageProps<"/accounts/[id]/edit">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.accounts.form.editTitle}
      </h1>
      <Suspense>
        <EditForm params={params} />
      </Suspense>
    </div>
  );
}

async function EditForm({
  params,
}: {
  params: PageProps<"/accounts/[id]/edit">["params"];
}) {
  const { id } = await params;
  const account = await getAccount(id);
  // A debt's starting amount is typed as a positive number, so it is shown that way
  const { amount } = displayBalance(account.type, account.openingBalance);
  return (
    <AccountForm
      mode="edit"
      id={account.id}
      currency={account.currency}
      name={account.name}
      type={account.type}
      startingAmount={
        isZero(account.openingBalance) ? "" : toDecimalString(amount)
      }
    />
  );
}
