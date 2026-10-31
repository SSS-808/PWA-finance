import { Suspense } from "react";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { EmptyAccounts, freeToSpend, listAccounts } from "@/modules/accounts";
import { safeNextPath } from "@/modules/auth";
import { listCategories } from "@/modules/categories";
import { isZero } from "@/modules/money";
import { getProfile, todayIn } from "@/modules/profile";
import { AddForm, readLastAccountId } from "@/modules/transactions";

export default function NewTransactionPage({
  searchParams,
}: PageProps<"/transactions/new">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <Suspense
        fallback={
          <>
            <LoadingStatus />
            <FormSkeleton title={en.transactions.addTitle} fields={4} />
          </>
        }
      >
        <NewEntry searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewEntry({
  searchParams,
}: {
  searchParams: PageProps<"/transactions/new">["searchParams"];
}) {
  const { from, kind } = await searchParams;
  const [profile, accounts, expenseCategories, incomeCategories, lastId] =
    await Promise.all([
      getProfile(),
      listAccounts(),
      listCategories("expense"),
      listCategories("income"),
      readLastAccountId(),
    ]);
  const active = accounts.filter((account) => !account.archived);
  const first = active[0];
  if (!first) {
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight">
          {en.transactions.addTitle}
        </h1>
        <EmptyAccounts />
      </>
    );
  }

  // The remembered account is used only while it is still active
  const defaultAccountId = active.some((account) => account.id === lastId)
    ? (lastId ?? first.id)
    : first.id;

  return (
    <AddForm
      title={en.transactions.addTitle}
      // A new key per visit: Next keeps the old form of an earlier visit, with stale values
      key={crypto.randomUUID()}
      returnTo={safeNextPath(typeof from === "string" ? from : null)}
      initialKind={kind === "income" ? "income" : "expense"}
      accounts={active.map(({ id, name, currency, balance, minimum }) => ({
        id,
        name,
        currency,
        free: isZero(minimum) ? null : freeToSpend(balance, minimum),
        minimum: isZero(minimum) ? null : minimum,
      }))}
      expenseCategories={expenseCategories}
      incomeCategories={incomeCategories}
      defaultAccountId={defaultAccountId}
      today={todayIn(profile.timeZone)}
    />
  );
}
