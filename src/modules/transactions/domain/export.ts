import { toDecimalString } from "@/modules/money";
import type { HistoryRow } from "./history";
import type { TransactionKind } from "./types";

export type ExportLabels = {
  columns: readonly [string, string, string, string, string, string, string];
  kinds: Record<TransactionKind, string>;
};

const LINE_END = "\r\n";
const FORMULA_START = /^[=+\-@\t\r]/;

// Wraps a cell in quotes when it holds a comma, quote or line break
function quote(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// Free text that a spreadsheet could run as a formula gets a leading quote
function safeText(text: string): string {
  return quote(FORMULA_START.test(text) ? `'${text}` : text);
}

// Turns history rows into CSV text for spreadsheets
export function transactionsToCsv(
  rows: readonly HistoryRow[],
  labels: ExportLabels,
): string {
  const lines = [labels.columns.map(quote)];
  for (const row of rows) {
    lines.push([
      quote(row.date),
      safeText(row.accountName),
      quote(row.amount.currency),
      quote(labels.kinds[row.kind]),
      safeText(row.categoryName ?? ""),
      quote(toDecimalString(row.amount)),
      safeText(row.note ?? ""),
    ]);
  }
  return lines.map((cells) => cells.join(",") + LINE_END).join("");
}
