import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import {
  FormSkeleton,
  LoadingStatus,
  Skeleton,
} from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import {
  FixBalanceForm,
  balanceText,
  getAccount,
  isDebt,
} from "@/modules/accounts";

export default function FixBalancePage({
  params,
}: PageProps<"/accounts/[id]/fix-balance">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Suspense
        fallback={
          <div className="space-y-6">
            <LoadingStatus />
            <Skeleton className="h-6 w-24" />
            <FormSkeleton title={en.accounts.fix.title} />
          </div>
        }
      >
        <FixBalance params={params} />
      </Suspense>
    </div>
  );
}

async function FixBalance({
  params,
}: {
  params: PageProps<"/accounts/[id]/fix-balance">["params"];
}) {
  const { id } = await params;
  const account = await getAccount(id);
  // The database refuses archived accounts, so the page doesn't offer them
  if (account.archived) notFound();

  return (
    <div className="space-y-6">
      <BackLink href={`/accounts/${account.id}`} label={account.name} />
      <FixBalanceForm
        id={account.id}
        title={en.accounts.fix.title}
        accountName={account.name}
        current={balanceText(account.type, account.balance).text}
        currency={account.currency}
        owing={isDebt(account.type)}
      />
    </div>
  );
}
