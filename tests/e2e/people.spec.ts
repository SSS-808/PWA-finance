import {
  expect as baseExpect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";
import { en } from "../../src/messages/en";
import {
  accountBox,
  accountRows,
  addAccount,
  openAddForm,
  openTransferForm,
  signUpAndConfirm,
  toBox,
} from "./helpers";

test.describe.configure({ timeout: 180_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

const text = en.people;
const UUID = "[0-9a-f-]{36}";

// Next.js keeps a hidden copy of the previous page, so lookups must only count what is on screen
function shown(locator: Locator) {
  return locator.filter({ visible: true });
}

function region(page: Page, name: string) {
  return shown(page.getByRole("region", { name, exact: true }));
}

// The form's code loads after the page; switch the kind back and forth until the buttons answer
async function openMoveForm(page: Page, kind: "lend" | "borrow") {
  await page.goto(`/people/move?kind=${kind}`);
  const lent = page.getByRole("radio", { name: text.move.lent });
  const borrowed = page.getByRole("radio", { name: text.move.borrowed });
  const [target, other] = kind === "lend" ? [lent, borrowed] : [borrowed, lent];
  await expect(async () => {
    await other.click();
    await expect(other).toHaveAttribute("aria-checked", "true", {
      timeout: 1000,
    });
  }).toPass();
  await target.click();
  await expect(target).toHaveAttribute("aria-checked", "true");
}

async function moveMoney(
  page: Page,
  move: {
    kind: "lend" | "borrow";
    person: string;
    account: string;
    amount: string;
  },
) {
  await openMoveForm(page, move.kind);
  await page
    .getByRole("textbox", { name: text.move.amount, exact: true })
    .fill(move.amount);
  await page.getByLabel(text.move.name, { exact: true }).fill(move.person);
  await page
    .getByLabel(
      move.kind === "lend" ? text.move.accountFrom : text.move.accountInto,
      { exact: true },
    )
    .selectOption({ label: move.account });
  await page.getByRole("button", { name: text.move.submit }).click();
  await expect(page).toHaveURL(new RegExp(`/people/${UUID}`));
  await expect(
    shown(page.getByRole("heading", { level: 1, name: move.person })),
  ).toBeVisible();
}

test("lending kip from an account puts a debt on the person and takes the money out of the account", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "BCEL", type: "bank", amount: "1,000,000" });
  await moveMoney(page, {
    kind: "lend",
    person: "Nok",
    account: "BCEL (₭)",
    amount: "100,000",
  });

  const kip = region(page, text.currencyNames.LAK);
  await expect(kip).toContainText("Owes you · Kip");
  await expect(kip).toContainText("₭100,000.00");

  await page.goto("/people");
  await expect(
    region(page, text.totalsLabel).getByText("₭100,000.00"),
  ).toBeVisible();
  await expect(shown(page.getByRole("link", { name: /Nok/ }))).toBeVisible();

  await page.goto("/accounts");
  await expect(accountRows(page, "BCEL")).toContainText("₭900,000.00");

  await page.goto("/");
  const card = region(page, en.currencies.LAK);
  await expect(
    card
      .getByText(en.dashboard.spending, { exact: true })
      .locator("xpath=following-sibling::dd"),
  ).toHaveText("₭0.00");

  // Home's short line and History's "To Nok" row both lead to Nok's page
  const line = shown(page.getByRole("link", { name: /^Lent & borrowed/ }));
  await expect(line).toContainText("Owed ₭100,000.00");
  await expect(line).not.toContainText("I owe");

  await page.goto("/transactions");
  const lending = shown(page.getByRole("link", { name: /To Nok/ }));
  await expect(lending).toBeVisible();
  await lending.click();
  await expect(page).toHaveURL(new RegExp(`/people/${UUID}$`));
});

test("a baht debt paid back into a kip account is paid off and the account goes up", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, {
    name: "Cash baht",
    currency: "THB",
    amount: "1,000",
  });
  await addAccount(page, { name: "Cash" });
  await moveMoney(page, {
    kind: "lend",
    person: "Nok",
    account: "Cash baht (฿)",
    amount: "500",
  });

  const baht = region(page, text.currencyNames.THB);
  await expect(baht).toContainText("฿500.00");
  await baht.getByRole("link", { name: text.paidBack, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/people/${UUID}/repay\\?jar=`));

  await page.getByRole("button", { name: /^All / }).click();
  await page.getByLabel(text.repay.into, { exact: true }).selectOption({
    label: "Cash (₭)",
  });
  await page
    .getByRole("textbox", { name: text.repay.accountAmount, exact: true })
    .fill("300,000");
  await expect(shown(page.getByText("1 ฿ = ₭600"))).toBeVisible();
  await page.getByRole("button", { name: text.move.submit }).click();

  await expect(page).toHaveURL(new RegExp(`/people/${UUID}`));
  await expect(
    shown(page.getByRole("heading", { level: 1, name: "Nok" })),
  ).toBeVisible();
  await expect(region(page, text.currencyNames.THB)).toHaveCount(0);

  await page.goto("/people");
  await expect(
    shown(page.getByRole("heading", { name: text.paidOffHeading })),
  ).toBeVisible();

  await page.goto("/accounts");
  await expect(accountRows(page, "Cash")).toContainText("₭300,000.00");
  await expect(accountRows(page, "Cash baht")).toContainText("฿500.00");
});

test("forgiving a debt you owe moves the person to Paid off and records the income", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "500,000" });
  await moveMoney(page, {
    kind: "borrow",
    person: "Ana",
    account: "Cash (₭)",
    amount: "200,000",
  });

  const kip = region(page, text.currencyNames.LAK);
  await expect(kip).toContainText("You owe · Kip");
  await expect(kip).toContainText("₭200,000.00");
  await kip.getByRole("button", { name: text.forgive, exact: true }).click();
  await page
    .getByRole("button", { name: text.forgiveDialog.confirmOwe })
    .click();
  await expect(region(page, text.currencyNames.LAK)).toHaveCount(0);

  await page.goto("/people");
  await expect(
    shown(page.getByRole("heading", { name: text.paidOffHeading })),
  ).toBeVisible();
  await expect(shown(page.getByRole("link", { name: /Ana/ }))).toBeVisible();

  await page.goto("/transactions?month=all");
  await expect(shown(page.getByText("Debts forgiven"))).toBeVisible();
});

test("the person never shows up as an account", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "500,000" });
  await addAccount(page, { name: "BCEL", type: "bank" });
  await moveMoney(page, {
    kind: "lend",
    person: "Nok",
    account: "Cash (₭)",
    amount: "10,000",
  });

  await page.goto("/accounts");
  await expect(shown(page.getByRole("link", { name: /Cash/ }))).toBeVisible();
  await expect(shown(page.getByText("Nok"))).toHaveCount(0);

  await openAddForm(page);
  await expect(accountBox(page).locator("option")).toHaveCount(2);
  await expect(
    accountBox(page).locator("option", { hasText: "Nok" }),
  ).toHaveCount(0);

  await openTransferForm(page);
  await expect(toBox(page).locator("option", { hasText: "Nok" })).toHaveCount(
    0,
  );
});
