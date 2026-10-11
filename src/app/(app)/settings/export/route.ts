import { en } from "@/messages/en";
import { requireUser } from "@/modules/auth";
import { getProfile, todayIn } from "@/modules/profile";
import {
  type ExportLabels,
  listAllTransactionsForExport,
  transactionsToCsv,
} from "@/modules/transactions";

const { columns } = en.export;

const labels: ExportLabels = {
  columns: [
    columns.date,
    columns.account,
    columns.currency,
    columns.type,
    columns.category,
    columns.amount,
    columns.note,
  ],
  kinds: en.transactions.kinds,
};

// Sends the signed-in person's own transactions as one CSV file
export async function GET() {
  await requireUser();
  const [rows, profile] = await Promise.all([
    listAllTransactionsForExport(),
    getProfile(),
  ]);
  const csv = transactionsToCsv(rows, labels);
  // The byte-order mark makes Excel read Lao and Thai text correctly
  const body = String.fromCharCode(0xfeff) + csv;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="personal-wallet-${todayIn(profile.timeZone)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
