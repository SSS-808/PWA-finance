import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import { type ExportLabels, transactionsToCsv } from "./export";
import type { HistoryRow } from "./history";

const labels: ExportLabels = {
  columns: [
    "Date",
    "Account",
    "Currency",
    "Type",
    "Category",
    "Amount",
    "Note",
  ],
  kinds: {
    expense: "Expense",
    income: "Income",
    transfer: "Transfer",
    opening_balance: "Starting amount",
    adjustment: "Balance fix",
  },
};

const HEADER = "Date,Account,Currency,Type,Category,Amount,Note\r\n";

function row(overrides: Partial<HistoryRow> = {}): HistoryRow {
  return {
    id: "row",
    kind: "expense",
    transferId: null,
    date: "2026-10-09",
    createdAt: "2026-10-09T08:00:00+00:00",
    accountName: "Cash",
    categoryName: "Food",
    categoryLook: { icon: "utensils", color: "orange" },
    note: null,
    amount: money(-45000, "LAK"),
    ...overrides,
  };
}

describe("transactionsToCsv", () => {
  it("gives only the header line when there are no rows", () => {
    expect(transactionsToCsv([], labels)).toBe(HEADER);
  });

  it("writes an expense with a negative amount and an income with a positive one", () => {
    const csv = transactionsToCsv(
      [
        row({ note: "Lunch" }),
        row({
          kind: "income",
          categoryName: "Salary",
          amount: money(3000000, "LAK"),
        }),
      ],
      labels,
    );
    expect(csv).toBe(
      HEADER +
        "2026-10-09,Cash,LAK,Expense,Food,-45000,Lunch\r\n" +
        "2026-10-09,Cash,LAK,Income,Salary,3000000,\r\n",
    );
  });

  it("keeps the decimals of a currency that has them", () => {
    const csv = transactionsToCsv(
      [row({ amount: money(1250, "USD"), accountName: "Wallet" })],
      labels,
    );
    expect(csv).toContain(",Wallet,USD,Expense,Food,12.50,");
  });

  it("leaves the category and note empty when they are null", () => {
    const csv = transactionsToCsv(
      [row({ kind: "opening_balance", categoryName: null })],
      labels,
    );
    expect(csv).toBe(
      HEADER + "2026-10-09,Cash,LAK,Starting amount,,-45000,\r\n",
    );
  });

  it("wraps a note with a comma in quotes", () => {
    const csv = transactionsToCsv([row({ note: "rice, fish" })], labels);
    expect(csv).toContain(',-45000,"rice, fish"\r\n');
  });

  it("doubles the quotes inside a note", () => {
    const csv = transactionsToCsv([row({ note: 'the "big" lunch' })], labels);
    expect(csv).toContain(',-45000,"the ""big"" lunch"\r\n');
  });

  it("keeps a line break inside a quoted note", () => {
    const csv = transactionsToCsv([row({ note: "one\ntwo" })], labels);
    expect(csv).toContain(',-45000,"one\ntwo"\r\n');
  });

  it.each(["=", "+", "-", "@"])(
    "puts a quote in front of a note that starts with %s",
    (start) => {
      const csv = transactionsToCsv([row({ note: `${start}1+1` })], labels);
      expect(csv).toContain(`,-45000,'${start}1+1\r\n`);
    },
  );

  it("also guards a tab, a carriage return, the account and the category", () => {
    const csv = transactionsToCsv(
      [
        row({
          accountName: "=Cash",
          categoryName: "@Food",
          note: "\tlunch",
        }),
        row({ note: "\rlunch" }),
      ],
      labels,
    );
    expect(csv).toContain(
      "2026-10-09,'=Cash,LAK,Expense,'@Food,-45000,'\tlunch\r\n",
    );
    expect(csv).toContain(',-45000,"\'\rlunch"\r\n');
  });

  it("quotes and guards a note that needs both", () => {
    const csv = transactionsToCsv([row({ note: '=1+1, "lunch"' })], labels);
    expect(csv).toContain(',-45000,"\'=1+1, ""lunch"""\r\n');
  });

  it("does not guard the amount, which starts with a minus sign", () => {
    const csv = transactionsToCsv([row()], labels);
    expect(csv).toContain(",Food,-45000,");
    expect(csv).not.toContain("'-45000");
  });

  it("passes Lao text through unchanged", () => {
    const csv = transactionsToCsv(
      [row({ accountName: "ເງິນສົດ", note: "ເຂົ້າປຸ້ນ" })],
      labels,
    );
    expect(csv).toContain(
      "2026-10-09,ເງິນສົດ,LAK,Expense,Food,-45000,ເຂົ້າປຸ້ນ\r\n",
    );
  });
});
