import { expect, test } from "@playwright/test";
import { en } from "../../src/messages/en";
import { addAccount, addEntry, signUpAndConfirm } from "./helpers";

test.describe.configure({ timeout: 90_000 });

test("Download my data saves every transaction as a safe CSV file", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100,000" });
  await addEntry(page, {
    amount: "45,000",
    category: "Food",
    note: '=1+1, "lunch"',
  });

  await page.goto("/settings");
  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: en.settings.data.download }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(
    /^personal-wallet-\d{4}-\d{2}-\d{2}\.csv$/,
  );

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf-8");

  expect(text.startsWith(String.fromCharCode(0xfeff))).toBe(true);
  const lines = text.slice(1).split("\r\n");
  const { columns } = en.export;
  expect(lines[0]).toBe(
    [
      columns.date,
      columns.account,
      columns.currency,
      columns.type,
      columns.category,
      columns.amount,
      columns.note,
    ].join(","),
  );
  const opening = lines.find((line) =>
    line.includes(en.transactions.kinds.opening_balance),
  );
  expect(opening).toContain(",Cash,LAK,");
  expect(opening).toContain(",100000,");
  const expense = lines.find((line) =>
    line.includes(en.transactions.kinds.expense),
  );
  expect(expense).toContain(",-45000,");
  expect(expense?.endsWith(`,"'=1+1, ""lunch"""`)).toBe(true);
});

test("opening the export address without logging in ends on the login page", async ({
  page,
}) => {
  await page.goto("/settings/export");
  await expect(page).toHaveURL(/\/login/);
});
