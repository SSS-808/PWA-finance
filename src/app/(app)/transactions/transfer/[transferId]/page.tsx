import { Suspense } from "react";
import { en } from "@/messages/en";
import { listAccounts } from "@/modules/accounts";
import { toDecimalString } from "@/modules/money";
import {
  DeleteTransferButton,
  TransferForm,
  getTransfer,
} from "@/modules/transactions";

export default function EditTransferPage({
  params,
}: PageProps<"/transactions/transfer/[transferId]">) {
  return (
    <div className="w-full max-w-md space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.transactions.transfer.editTitle}
      </h1>
      <Suspense>
        <EditTransfer params={params} />
      </Suspense>
    </div>
  );
}

async function EditTransfer({
  params,
}: {
  params: PageProps<"/transactions/transfer/[transferId]">["params"];
}) {
  const { transferId } = await params;
  const transfer = await getTransfer(transferId);
  const accounts = await listAccounts();
  // The transfer's own accounts stay in the lists even if archived since; saving then asks for another one
  const options = accounts
    .filter(
      (account) =>
        !account.archived ||
        account.id === transfer.from ||
        account.id === transfer.to,
    )
    .map(({ id, name, currency }) => ({ id, name, currency }));
  const exchange = transfer.fromAmount.currency !== transfer.toAmount.currency;

  return (
    <div className="space-y-6">
      <TransferForm
        // A new key per visit: Next keeps the old form of an earlier visit, with stale values
        key={crypto.randomUUID()}
        mode="edit"
        transferId={transfer.id}
        accounts={options}
        initial={{
          fromAccountId: transfer.from,
          toAccountId: transfer.to,
          amount: toDecimalString(transfer.fromAmount),
          arrived: exchange ? toDecimalString(transfer.toAmount) : "",
          date: transfer.date,
          note: transfer.note ?? "",
        }}
      />
      <DeleteTransferButton transferId={transfer.id} />
    </div>
  );
}
