import { ToastOnce } from "@/components/shared/toast-once";
import { en } from "@/messages/en";
import { formatMoney, isNegative, negate } from "@/modules/money";
import { getSavedSummary, getSavedTransferSummary } from "../server/queries";

// Shows "Saved: Food ₭45,000" for ?saved=<id>, the transfer version for ?saved_transfer=<id> and "Deleted." for ?deleted=1; only an id is in the URL
export async function SavedNotice({
  saved,
  savedTransfer,
  deleted,
}: {
  saved?: string | string[];
  savedTransfer?: string | string[];
  deleted?: string | string[];
}) {
  if (deleted === "1") {
    return <ToastOnce message={en.transactions.deleted} param="deleted" />;
  }
  if (typeof savedTransfer === "string") {
    return <SavedTransfer transferId={savedTransfer} />;
  }
  if (typeof saved !== "string") return null;
  const summary = await getSavedSummary(saved);
  if (!summary) return null;

  const label = summary.categoryName ?? en.transactions.kinds[summary.kind];
  // The note shows the size of the amount; the sign is for the History list
  const amount = formatMoney(
    isNegative(summary.amount) ? negate(summary.amount) : summary.amount,
  );
  return (
    <ToastOnce
      message={en.transactions.saved
        .replace("{label}", () => label)
        .replace("{amount}", () => amount)}
      param="saved"
    />
  );
}

// "Saved: BCEL → Cash ₭500,000", or both amounts when the currencies differ
async function SavedTransfer({ transferId }: { transferId: string }) {
  const summary = await getSavedTransferSummary(transferId);
  if (!summary) return null;

  const { from, to, fromAmount, toAmount } = summary;
  const exchange = fromAmount.currency !== toAmount.currency;
  const text = exchange
    ? en.transactions.transfer.savedExchange
        .replace("{from}", () => from)
        .replace("{to}", () => to)
        .replace("{fromAmount}", () => formatMoney(fromAmount))
        .replace("{toAmount}", () => formatMoney(toAmount))
    : en.transactions.transfer.savedTransfer
        .replace("{from}", () => from)
        .replace("{to}", () => to)
        .replace("{amount}", () => formatMoney(toAmount));
  return <ToastOnce message={text} param="saved_transfer" />;
}
