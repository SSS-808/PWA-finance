import { en } from "@/messages/en";
import { formatMoney, isNegative, negate } from "@/modules/money";
import { getSavedSummary } from "../server/queries";

const noticeClass =
  "rounded-lg bg-muted px-3 py-2 text-sm text-foreground break-words";

// Shows "Saved: Food ₭45,000" for ?saved=<id> and "Deleted." for ?deleted=1; only an id is in the URL
export async function SavedNotice({
  saved,
  deleted,
}: {
  saved?: string | string[];
  deleted?: string | string[];
}) {
  if (deleted === "1") {
    return (
      <p role="status" className={noticeClass}>
        {en.transactions.deleted}
      </p>
    );
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
    <p role="status" className={noticeClass}>
      {en.transactions.saved
        .replace("{label}", () => label)
        .replace("{amount}", () => amount)}
    </p>
  );
}
