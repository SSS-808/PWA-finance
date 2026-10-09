import { Suspense } from "react";
import { en } from "@/messages/en";
import { listAccounts } from "@/modules/accounts";
import { listCategories } from "@/modules/categories";
import { isNegative, negate, toDecimalString } from "@/modules/money";
import { DeleteEntryButton, EntryForm, getEntry } from "@/modules/transactions";

export default function EditTransactionPage({
  params,
}: PageProps<"/transactions/[id]">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.transactions.editTitle}
      </h1>
      <Suspense>
        <EditEntry params={params} />
      </Suspense>
    </div>
  );
}

async function EditEntry({
  params,
}: {
  params: PageProps<"/transactions/[id]">["params"];
}) {
  const { id } = await params;
  const entry = await getEntry(id);
  const [accounts, expenseCategories, incomeCategories] = await Promise.all([
    listAccounts(),
    listCategories("expense"),
    listCategories("income"),
  ]);
  // The entry's own account stays in the list even if it was archived since
  const options = accounts
    .filter((account) => !account.archived || account.id === entry.accountId)
    .map(({ id: accountId, name, currency }) => ({
      id: accountId,
      name,
      currency,
    }));
  // The form shows the amount without a sign; the Income/Expense switch carries the sign
  const size = isNegative(entry.amount) ? negate(entry.amount) : entry.amount;

  return (
    <div className="space-y-6">
      <EntryForm
        // A new key per visit: Next keeps the old form of an earlier visit, with stale values
        key={crypto.randomUUID()}
        mode="edit"
        id={entry.id}
        accounts={options}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        initial={{
          kind: entry.kind,
          amount: toDecimalString(size),
          accountId: entry.accountId,
          categoryId: entry.categoryId,
          date: entry.date,
          note: entry.note ?? "",
        }}
      />
      <DeleteEntryButton id={entry.id} />
    </div>
  );
}
