import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import {
  FormSkeleton,
  LoadingStatus,
  Skeleton,
} from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { AccountForm, displayBalance, getAccount } from "@/modules/accounts";
import { isZero, toDecimalString } from "@/modules/money";

export default function EditAccountPage({
  params,
}: PageProps<"/accounts/[id]/edit">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <LoadingStatus />
            <Skeleton className="h-6 w-24" />
            <FormSkeleton title={en.accounts.form.editTitle} />
          </div>
        }
      >
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
    <div className="space-y-6">
      <BackLink href={`/accounts/${account.id}`} label={account.name} />
      <AccountForm
        mode="edit"
        title={en.accounts.form.editTitle}
        id={account.id}
        currency={account.currency}
        name={account.name}
        type={account.type}
        startingAmount={
          isZero(account.openingBalance) ? "" : toDecimalString(amount)
        }
      />
    </div>
  );
}
