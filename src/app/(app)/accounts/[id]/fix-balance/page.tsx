import { notFound } from "next/navigation";
import { Suspense } from "react";
import { en } from "@/messages/en";
import {
  FixBalanceForm,
  displayBalance,
  getAccount,
  isDebt,
} from "@/modules/accounts";
import { formatMoney } from "@/modules/money";

export default function FixBalancePage({
  params,
}: PageProps<"/accounts/[id]/fix-balance">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.accounts.fix.title}
      </h1>
      <Suspense>
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
  const { amount, owed } = displayBalance(account.type, account.balance);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-base break-words text-muted-foreground">
          {account.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {en.accounts.fix.current}
        </p>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {formatMoney(amount)}
          {owed ? (
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              {en.accounts.owed}
            </span>
          ) : null}
        </p>
      </div>
      <FixBalanceForm
        id={account.id}
        currency={account.currency}
        owing={isDebt(account.type)}
      />
    </div>
  );
}
