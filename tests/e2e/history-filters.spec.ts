import {
  expect as baseExpect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";
import { en } from "../../src/messages/en";
import { addAccount, addEntry, addTransfer, signUpAndConfirm } from "./helpers";

test.describe.configure({ timeout: 120_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

const widths = [320, 390, 768, 1024, 1280, 1440];
const UUID = "[0-9a-f-]{36}";
const text = en.transactions.filters;

type Filter = {
  account?: string;
  category?: string;
  type?: string;
  q?: string;
};

// Next.js keeps a hidden copy of the previous page, so text lookups must only count what is on screen
function shown(locator: Locator) {
  return locator.filter({ visible: true });
}

function selectBox(page: Page, label: string) {
  return page.getByRole("combobox", { name: label, exact: true });
}

function searchBox(page: Page) {
  return page.getByRole("searchbox", { name: text.search, exact: true });
}

function row(page: Page, name: RegExp) {
  return page.getByRole("link", { name });
}

function countText(page: Page, message: string) {
  return shown(page.getByText(message, { exact: true }));
}

// Sets every field (an unset one goes back to "all"), applies, and the caller then checks the new URL
async function applyFilters(page: Page, filter: Filter) {
  await selectBox(page, text.account).selectOption({
    label: filter.account ?? text.allAccounts,
  });
  await selectBox(page, text.category).selectOption({
    label: filter.category ?? text.allCategories,
  });
  await selectBox(page, text.type).selectOption({
    label: filter.type ?? text.allTypes,
  });
  await searchBox(page).fill(filter.q ?? "");
  await page.getByRole("button", { name: text.apply }).click();
}

async function expectNoOverflow(page: Page, label: string) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `${label} at ${width}px`).toBeLessThanOrEqual(0);
  }
}

test("the account filter shows a transfer touching that account as one row", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "BCEL", type: "bank", amount: "1,000,000" });
  await addAccount(page, { name: "Cash", amount: "5,000" });
  await addAccount(page, { name: "Wallet", amount: "7,000" });
  await addTransfer(page, { from: "BCEL", to: "Cash", amount: "100,000" });
  await addEntry(page, {
    amount: "20,000",
    category: "Food",
    account: "Wallet",
  });

  await page.goto("/transactions");
  await expect(countText(page, "5 transactions")).toBeVisible();
  await expect(row(page, /BCEL → Cash/)).toHaveCount(1);

  // The receiving account: its starting amount and the transfer
  await applyFilters(page, { account: "Cash" });
  await expect(page).toHaveURL(
    new RegExp(`account=${UUID}&category=&type=&q=$`),
  );
  await expect(countText(page, "2 transactions")).toBeVisible();
  await expect(row(page, /BCEL → Cash/)).toHaveCount(1);
  await expect(row(page, /Food/)).toHaveCount(0);

  // The sending account shows the same transfer, still as one row
  await applyFilters(page, { account: "BCEL" });
  await expect(countText(page, "2 transactions")).toBeVisible();
  await expect(row(page, /BCEL → Cash/)).toHaveCount(1);

  // An account the transfer doesn't touch
  await applyFilters(page, { account: "Wallet" });
  await expect(countText(page, "2 transactions")).toBeVisible();
  await expect(row(page, /Food/)).toHaveCount(1);
  await expect(row(page, /BCEL → Cash/)).toHaveCount(0);

  await expectNoOverflow(page, "History with filters");
});

test("type and category narrow the list together", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100,000" });
  await addEntry(page, { amount: "10,000", category: "Food" });
  await addEntry(page, { amount: "20,000", category: "Transportation" });
  await addEntry(page, {
    amount: "500,000",
    category: "Salary",
    kind: "income",
  });

  await page.goto("/transactions");
  await expect(countText(page, "4 transactions")).toBeVisible();

  // The month bar steps back to an empty month and forward again, but not past this month
  await expect(page.getByRole("link", { name: text.nextMonth })).toHaveCount(0);
  await page.getByRole("link", { name: text.previousMonth }).click();
  await expect(page).toHaveURL(/month=\d{4}-\d{2}$/);
  await expect(
    page.getByRole("heading", { name: en.transactions.empty }),
  ).toBeVisible();
  await page.getByRole("link", { name: text.nextMonth }).click();
  await expect(countText(page, "4 transactions")).toBeVisible();

  await applyFilters(page, { type: en.transactions.kinds.income });
  await expect(page).toHaveURL(/type=income/);
  await expect(countText(page, "1 transaction")).toBeVisible();
  await expect(row(page, /Salary/)).toHaveCount(1);
  await expect(row(page, /Food/)).toHaveCount(0);

  await applyFilters(page, { category: "Food" });
  await expect(page).toHaveURL(new RegExp(`category=${UUID}&type=&`));
  await expect(countText(page, "1 transaction")).toBeVisible();
  await expect(row(page, /Food/)).toHaveCount(1);
  await expect(row(page, /Transportation|Salary/)).toHaveCount(0);

  await applyFilters(page, {
    category: "Food",
    type: en.transactions.kinds.expense,
  });
  await expect(page).toHaveURL(/type=expense/);
  await expect(countText(page, "1 transaction")).toBeVisible();
  await expect(row(page, /Food/)).toHaveCount(1);

  // A category and a type that can't go together
  await applyFilters(page, {
    category: "Food",
    type: en.transactions.kinds.income,
  });
  await expect(page).toHaveURL(/type=income/);
  await expect(page.getByRole("heading", { name: text.none })).toBeVisible();

  await applyFilters(page, { type: text.typeOther });
  await expect(page).toHaveURL(/type=other/);
  await expect(countText(page, "1 transaction")).toBeVisible();
  await expect(
    shown(
      page.getByText(en.transactions.kinds.opening_balance, { exact: true }),
    ),
  ).toBeVisible();
});

test("search finds a note and Clear resets", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100,000" });
  await addEntry(page, {
    amount: "10,000",
    category: "Food",
    note: "Lunch 50% off",
  });
  await addEntry(page, {
    amount: "20,000",
    category: "Food",
    note: "Taxi to airport",
  });

  await page.goto("/transactions");
  await expect(countText(page, "3 transactions")).toBeVisible();

  // The match ignores upper and lower case
  await applyFilters(page, { q: "taxi" });
  await expect(page).toHaveURL(/q=taxi$/);
  await expect(countText(page, "1 transaction")).toBeVisible();
  await expect(row(page, /Taxi to airport/)).toHaveCount(1);
  await expect(row(page, /Lunch/)).toHaveCount(0);

  // A % in the search is a plain character, not "anything"
  await applyFilters(page, { q: "50%" });
  await expect(page).toHaveURL(/q=50%25$/);
  await expect(countText(page, "1 transaction")).toBeVisible();
  await expect(row(page, /Lunch 50% off/)).toHaveCount(1);
  await applyFilters(page, { q: "%" });
  await expect(page).toHaveURL(/q=%25$/);
  await expect(countText(page, "1 transaction")).toBeVisible();
  await expect(row(page, /Taxi/)).toHaveCount(0);

  await applyFilters(page, { q: "zzz" });
  await expect(page).toHaveURL(/q=zzz$/);
  await expect(page.getByRole("heading", { name: text.none })).toBeVisible();

  await page.getByRole("link", { name: text.clear }).first().click();
  await expect(page).toHaveURL(/\/transactions\?month=\d{4}-\d{2}$/);
  await expect(countText(page, "3 transactions")).toBeVisible();
  await expect(searchBox(page)).toHaveValue("");
});

test("an account page lists its transactions and links to the filtered History", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100,000" });
  await addAccount(page, { name: "Wallet", amount: "50,000" });
  await addEntry(page, { amount: "10,000", category: "Food", account: "Cash" });
  await addEntry(page, {
    amount: "5,000",
    category: "Food",
    account: "Wallet",
  });

  await page.goto("/accounts");
  await page.getByRole("link", { name: /^Cash/ }).click();
  await expect(page).toHaveURL(new RegExp(`/accounts/${UUID}$`));
  const accountId = page.url().split("/").pop() ?? "";
  await expect(row(page, /Food.*-₭10,000/)).toBeVisible();
  await expect(row(page, /-₭5,000/)).toHaveCount(0);
  await expect(
    shown(
      page.getByText(en.transactions.kinds.opening_balance, { exact: true }),
    ),
  ).toBeVisible();
  await expectNoOverflow(page, "Account page");

  await page.getByRole("link", { name: en.accounts.detail.seeAll }).click();
  await expect(page).toHaveURL(
    new RegExp(`/transactions\\?account=${accountId}&month=all$`),
  );
  await expect(countText(page, "2 transactions")).toBeVisible();
  await expect(selectBox(page, text.account)).toHaveValue(accountId);
  await expect(
    shown(page.getByText(text.allMonths, { exact: true })),
  ).toBeVisible();
  await expect(row(page, /Food.*-₭10,000/)).toBeVisible();
  await expect(row(page, /-₭5,000/)).toHaveCount(0);
});
