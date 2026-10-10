import {
  expect as baseExpect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";
import { en } from "../../src/messages/en";
import {
  addAccount,
  addTransfer,
  amountBox,
  arrivedBox,
  fromBox,
  noteBox,
  openTransferForm,
  saveButton,
  signUpAndConfirm,
  toBox,
  waitForSaved,
} from "./helpers";

test.describe.configure({ timeout: 90_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

const widths = [320, 390, 768, 1024, 1280, 1440];
const UUID = "[0-9a-f-]{36}";
const NOT_FOUND = "This page could not be found.";

function mainNav(page: Page) {
  return page.getByRole("navigation", { name: en.nav.label });
}

// Next.js keeps a hidden copy of the previous page, so text lookups must only count what is on screen
function shown(locator: Locator) {
  return locator.filter({ visible: true });
}

function notice(page: Page, message: string) {
  return page.locator("[data-sonner-toast]").filter({ hasText: message });
}

function accountLink(page: Page, name: RegExp) {
  return page.getByRole("link", { name });
}

// Opens an account from the list and returns its id
async function openAccount(page: Page, name: RegExp): Promise<string> {
  await page.goto("/accounts");
  await accountLink(page, name).click();
  await expect(page).toHaveURL(new RegExp(`/accounts/${UUID}$`));
  return page.url().split("/").pop() ?? "";
}

async function openFixBalance(page: Page, name: RegExp): Promise<string> {
  const id = await openAccount(page, name);
  await page.getByRole("link", { name: en.accounts.fix.title }).click();
  await expect(page).toHaveURL(new RegExp(`/accounts/${id}/fix-balance$`));
  return id;
}

function fixBox(page: Page) {
  return page
    .getByRole("textbox", { name: en.accounts.fix.assetLabel })
    .or(page.getByRole("textbox", { name: en.accounts.fix.debtLabel }));
}

function fixSave(page: Page) {
  return page.getByRole("button", { name: en.accounts.fix.submit });
}

// True when nothing sticks out sideways and the last element is clear of the nav
async function expectFits(page: Page, label: string, width: number) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, `${label} at ${width}px`).toBeLessThanOrEqual(0);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const lastBottom = await page.evaluate(() => {
    let element: Element | null = document.querySelector("main");
    while (element?.lastElementChild) element = element.lastElementChild;
    return element?.getBoundingClientRect().bottom ?? 0;
  });
  const navBox = await mainNav(page).boundingBox();
  if (width < 1024) {
    expect(lastBottom, `${label} at ${width}px`).toBeLessThanOrEqual(
      navBox?.y ?? 0,
    );
  } else {
    expect(lastBottom, `${label} at ${width}px`).toBeLessThanOrEqual(800);
  }
}

test("a transfer shows as one row in History and moves both balances", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "BCEL", type: "bank", amount: "1,000,000" });
  await addAccount(page, { name: "Cash" });

  await openTransferForm(page);
  await expect(
    page.getByRole("heading", { level: 1, name: en.transactions.addTitle }),
  ).toBeVisible();
  // Expense stays the default view; Transfer is a third choice
  await expect(amountBox(page)).toBeFocused();
  // Nothing is chosen for To, and the arrived box waits for two currencies
  await expect(toBox(page)).toHaveValue("");
  await fromBox(page).selectOption({ label: "BCEL" });
  await toBox(page).selectOption({ label: "Cash" });
  await expect(arrivedBox(page)).toHaveCount(0);
  await amountBox(page).fill("500,000");
  await saveButton(page).click();

  await expect(page).toHaveURL(/\/accounts$/);
  await expect(notice(page, "Saved: BCEL → Cash ₭500,000")).toBeVisible();
  await expect(accountLink(page, /^BCEL\b.*₭500,000/)).toBeVisible();
  await expect(accountLink(page, /^Cash\b.*₭500,000/)).toBeVisible();

  await page.goto("/transactions");
  const day = page.getByRole("region", { name: en.transactions.today });
  const rows = day.getByRole("link", { name: /BCEL → Cash/ });
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("₭500,000");
});

test("an exchange asks how much arrived and keeps both amounts", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, {
    name: "USD Cash",
    currency: "USD",
    amount: "200",
  });
  await addAccount(page, { name: "Cash" });

  await openTransferForm(page);
  await fromBox(page).selectOption({ label: "USD Cash" });
  await expect(arrivedBox(page)).toHaveCount(0);
  await toBox(page).selectOption({ label: "Cash" });
  await expect(arrivedBox(page)).toBeVisible();

  // The server is not asked until the arrived amount is filled in
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await amountBox(page).fill("100");
  await saveButton(page).click();
  await expect(
    shown(page.getByText(en.transactions.errors.arrived_required)),
  ).toBeVisible();
  expect(posts).toEqual([]);

  await arrivedBox(page).fill("2,150,000");
  await saveButton(page).click();
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(
    notice(page, "Saved: USD Cash → Cash $100.00 → ₭2,150,000"),
  ).toBeVisible();
  await expect(accountLink(page, /^USD Cash\b.*\$100\.00/)).toBeVisible();
  await expect(accountLink(page, /^Cash\b.*₭2,150,000/)).toBeVisible();

  await page.goto("/transactions");
  const row = page.getByRole("link", { name: /USD Cash → Cash/ });
  await expect(row).toContainText("-$100.00");
  await expect(row).toContainText("+₭2,150,000");
});

test("a transfer can be edited and then deleted in two steps, both accounts following", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "BCEL", type: "bank", amount: "1,000,000" });
  await addAccount(page, { name: "Cash" });
  await addTransfer(page, {
    from: "BCEL",
    to: "Cash",
    amount: "500,000",
    note: "Cash out",
  });

  await page.goto("/transactions");
  await page.getByRole("link", { name: /BCEL → Cash/ }).click();
  await expect(page).toHaveURL(new RegExp(`/transactions/transfer/${UUID}$`));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: en.transactions.transfer.editTitle,
    }),
  ).toBeVisible();
  // The form is prefilled with the amount that left, without a sign
  await expect(amountBox(page)).toHaveValue("500000");
  await expect(fromBox(page).locator("option:checked")).toHaveText("BCEL");
  await expect(toBox(page).locator("option:checked")).toHaveText("Cash");
  await expect(noteBox(page)).toHaveValue("Cash out");
  await expect(arrivedBox(page)).toHaveCount(0);

  await amountBox(page).fill("300,000");
  await saveButton(page).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(notice(page, "Saved: BCEL → Cash ₭300,000")).toBeVisible();
  await expect(page.getByRole("link", { name: /BCEL → Cash/ })).toHaveCount(1);

  await page.goto("/accounts");
  await expect(accountLink(page, /^BCEL\b.*₭700,000/)).toBeVisible();
  await expect(accountLink(page, /^Cash\b.*₭300,000/)).toBeVisible();

  await page.goto("/transactions");
  await page.getByRole("link", { name: /BCEL → Cash/ }).click();
  // Cancelling the confirmation changes nothing
  await page.getByRole("button", { name: en.transactions.delete }).click();
  await expect(
    shown(page.getByText(en.transactions.transfer.deleteConfirm)),
  ).toBeVisible();
  await page.getByRole("button", { name: en.transactions.cancel }).click();
  await expect(
    page.getByRole("button", { name: en.transactions.delete }),
  ).toBeVisible();

  await page.getByRole("button", { name: en.transactions.delete }).click();
  await page.getByRole("button", { name: en.transactions.deleteYes }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(notice(page, en.transactions.deleted)).toBeVisible();
  await expect(page.getByRole("link", { name: /BCEL → Cash/ })).toHaveCount(0);

  await page.goto("/accounts");
  await expect(accountLink(page, /^BCEL\b.*₭1,000,000/)).toBeVisible();
  await expect(accountLink(page, /^Cash\b.*₭0/)).toBeVisible();
});

test("an exchange can be edited and its arrived amount is prefilled", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "USD Cash", currency: "USD", amount: "200" });
  await addAccount(page, { name: "Cash" });
  await addTransfer(page, {
    from: "USD Cash",
    to: "Cash",
    amount: "100",
    arrived: "2,150,000",
  });

  await page.goto("/transactions");
  await page.getByRole("link", { name: /USD Cash → Cash/ }).click();
  await expect(amountBox(page)).toHaveValue("100.00");
  await expect(arrivedBox(page)).toHaveValue("2150000");
  await arrivedBox(page).fill("2,200,000");
  await saveButton(page).click();
  await expect(
    notice(page, "Saved: USD Cash → Cash $100.00 → ₭2,200,000"),
  ).toBeVisible();
});

test("choosing the same account twice is refused before the server is asked", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "BCEL", type: "bank", amount: "1,000" });
  await addAccount(page, { name: "Cash" });
  await openTransferForm(page);

  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });

  // Nothing chosen for To yet
  await amountBox(page).fill("100");
  await saveButton(page).click();
  await expect(
    shown(page.getByText(en.transactions.errors.account_required)),
  ).toBeVisible();

  await fromBox(page).selectOption({ label: "Cash" });
  await toBox(page).selectOption({ label: "Cash" });
  await saveButton(page).click();
  await expect(
    shown(page.getByText(en.transactions.errors.same_account)),
  ).toBeVisible();
  expect(posts).toEqual([]);
  await expect(page).toHaveURL(/\/transactions\/new/);

  // Picking another account clears the way
  await toBox(page).selectOption({ label: "BCEL" });
  await saveButton(page).click();
  await waitForSaved(page);
});

test("a user with one account is told they need two", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000" });
  await openTransferForm(page);

  await expect(
    shown(page.getByText(en.transactions.transfer.needTwo)),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: en.transactions.transfer.addAccount,
      exact: true,
    }),
  ).toBeVisible();
  await expect(amountBox(page)).toHaveCount(0);

  // The switch is still there, so the person can go back to an expense
  await page
    .getByRole("button", { name: en.transactions.kinds.expense })
    .click();
  await expect(
    page.getByRole("textbox", {
      name: en.transactions.form.amount,
      exact: true,
    }),
  ).toBeVisible();
});

test("Fix balance adds the difference as a Balance fix, and says so when nothing differs", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });

  await openFixBalance(page, /^Cash\b/);
  await expect(
    page.getByRole("heading", { level: 1, name: en.accounts.fix.title }),
  ).toBeVisible();
  await expect(shown(page.getByText(en.accounts.fix.current))).toBeVisible();
  await expect(shown(page.getByText("₭1,000,000"))).toBeVisible();
  await expect(fixBox(page)).toBeFocused();
  await expect(
    page.getByRole("textbox", { name: en.accounts.fix.note }),
  ).toHaveAttribute("placeholder", en.accounts.fix.noteHint);

  // An empty box or a minus sign is refused
  await fixSave(page).click();
  await expect(
    shown(page.getByText(en.accounts.errors.amount_invalid)),
  ).toBeVisible();
  await fixBox(page).fill("-5");
  await fixSave(page).click();
  await expect(
    shown(page.getByText(en.accounts.errors.amount_negative)),
  ).toBeVisible();

  await fixBox(page).fill("950,000");
  await fixSave(page).click();
  await expect(page).toHaveURL(new RegExp(`/accounts/${UUID}$`));
  await expect(notice(page, en.accounts.notices.fixed)).toBeVisible();
  await expect(shown(page.getByText("₭950,000"))).toBeVisible();

  await page.goto("/transactions");
  const day = page.getByRole("region", { name: en.transactions.today });
  const fixRows = day.getByText(en.transactions.kinds.adjustment);
  await expect(fixRows).toHaveCount(1);
  await expect(shown(day.getByText("-₭50,000"))).toBeVisible();

  // The same number again changes nothing
  await openFixBalance(page, /^Cash\b/);
  await fixBox(page).fill("950,000");
  await fixSave(page).click();
  await expect(page).toHaveURL(new RegExp(`/accounts/${UUID}$`));
  await expect(notice(page, en.accounts.notices.nothing_to_fix)).toBeVisible();
  await page.goto("/transactions");
  await expect(
    page
      .getByRole("region", { name: en.transactions.today })
      .getByText(en.transactions.kinds.adjustment),
  ).toHaveCount(1);
});

test("Fix balance on a debt is typed as what you owe", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, {
    name: "Visa",
    type: "credit_card",
    currency: "USD",
    amount: "30",
  });

  await openFixBalance(page, /^Visa\b/);
  await expect(
    page.getByRole("textbox", { name: en.accounts.fix.debtLabel }),
  ).toBeVisible();
  await expect(shown(page.getByText(en.accounts.fix.assetLabel))).toHaveCount(
    0,
  );
  await expect(shown(page.getByText(/\$30\.00/))).toContainText(
    en.accounts.owed,
  );

  await fixBox(page).fill("45");
  await fixSave(page).click();
  await expect(notice(page, en.accounts.notices.fixed)).toBeVisible();
  await expect(shown(page.getByText(/\$45\.00/))).toContainText("$45.00 owed");
});

test("another person's transfer, and an id that is not a uuid, give not found", async ({
  page,
  browser,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "BCEL", type: "bank", amount: "1,000" });
  await addAccount(page, { name: "Cash" });
  await addTransfer(page, { from: "BCEL", to: "Cash", amount: "100" });
  await page.goto("/transactions");
  await page.getByRole("link", { name: /BCEL → Cash/ }).click();
  await expect(page).toHaveURL(new RegExp(`/transactions/transfer/${UUID}$`));
  const id = page.url().split("/").pop() ?? "";

  const other = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const stranger = await other.newPage();
  await signUpAndConfirm(stranger);
  for (const path of [
    `/transactions/transfer/${id}`,
    "/transactions/transfer/not-a-uuid",
  ]) {
    await stranger.goto(path);
    await expect(shown(stranger.getByText(NOT_FOUND))).toBeVisible();
    await expect(amountBox(stranger)).toHaveCount(0);
  }
  await other.close();

  // The owner still sees it
  await page.goto(`/transactions/transfer/${id}`);
  await expect(amountBox(page)).toHaveValue("100");
});

test("the Transfer view and the Fix balance page fit every width", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await signUpAndConfirm(page);
  await addAccount(page, {
    name: "A very long account name that keeps going and going",
    type: "bank",
    currency: "USD",
    amount: "123,456,789",
  });
  await addAccount(page, {
    name: "Another very long account name that keeps going on",
    amount: "123,456,789,012",
  });

  await openTransferForm(page, "/transactions/new");
  await fromBox(page).selectOption({ index: 0 });
  await toBox(page).selectOption({ index: 2 });
  await expect(arrivedBox(page)).toBeVisible();
  await amountBox(page).fill("12,345,678.90");
  await arrivedBox(page).fill("123,456,789,012");
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await expect(saveButton(page)).toBeVisible();
    await expectFits(page, "Transfer view", width);
  }

  await openAccount(page, /^A very long account name/);
  const fixHref = await page
    .getByRole("link", { name: en.accounts.fix.title })
    .getAttribute("href");
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(fixHref ?? "/");
    await expect(fixSave(page)).toBeVisible();
    await expectFits(page, "Fix balance page", width);
  }
});
