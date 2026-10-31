import { expect, test, type Locator, type Page } from "@playwright/test";
import { en } from "../../src/messages/en";
import { accountBox, accountRows, signUpAndConfirm } from "./helpers";

test.describe.configure({ timeout: 90_000 });

const widths = [320, 390, 768, 1024, 1280, 1440];

type NewAccount = {
  name: string;
  type?: string;
  currency?: string;
  amount?: string;
};

function mainNav(page: Page) {
  return page.getByRole("navigation", { name: en.nav.label });
}

// Next.js keeps a hidden copy of the previous page, so text lookups must only count what is on screen
function shown(locator: Locator) {
  return locator.filter({ visible: true });
}

function nameBox(page: Page) {
  return page.getByRole("textbox", {
    name: en.accounts.form.name,
    exact: true,
  });
}

function typeBox(page: Page) {
  return page.getByRole("combobox", {
    name: en.accounts.form.type,
    exact: true,
  });
}

function currencyBox(page: Page) {
  return page.getByRole("combobox", {
    name: en.accounts.form.currency,
    exact: true,
  });
}

// Both labels of the starting amount end in "now?"
function amountBox(page: Page) {
  return page.getByRole("textbox", { name: /now\?$/ });
}

function notice(page: Page, message: string) {
  return page.locator("[data-sonner-toast]").filter({ hasText: message });
}

function submitNew(page: Page) {
  return page.getByRole("button", { name: en.accounts.form.save });
}

async function addAccount(page: Page, account: NewAccount) {
  await page.goto("/accounts/new");
  await nameBox(page).fill(account.name);
  await typeBox(page).selectOption(account.type ?? "cash");
  await currencyBox(page).selectOption(account.currency ?? "LAK");
  if (account.amount) await amountBox(page).fill(account.amount);
  await submitNew(page).click();
  await expect(notice(page, en.accounts.notices.added)).toBeVisible();
  await expect(page).toHaveURL(/\/accounts$/);
}

function accountCard(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

// The row of one currency inside the card named after the account
function currencyRow(page: Page, name: string, currency = "LAK") {
  const currencyName = en.currencies[currency as keyof typeof en.currencies];
  return accountRows(page, name).filter({ hasText: currencyName });
}

// Follows a link to an account and returns its id
async function followToAccount(page: Page, link: Locator): Promise<string> {
  await link.click();
  await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop() ?? "";
}

// Opens an account from its card on the list and returns its id
function openAccount(page: Page, name: string, currency = "LAK") {
  return followToAccount(page, currencyRow(page, name, currency));
}

test("a new user sees the empty state on Home and on Accounts", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await expect(
    page.getByRole("heading", { name: en.home.startTitle }),
  ).toBeVisible();

  await mainNav(page).getByRole("link", { name: en.nav.accounts }).click();
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(
    page.getByRole("heading", { name: en.accounts.emptyTitle }),
  ).toBeVisible();
  await expect(
    mainNav(page).getByRole("link", { name: en.nav.accounts }),
  ).toHaveAttribute("aria-current", "page");

  await page
    .getByRole("link", { name: en.accounts.addFirst, exact: true })
    .click();
  await expect(page).toHaveURL(/\/accounts\/new$/);
  await expect(
    page.getByRole("heading", { level: 1, name: en.accounts.form.newTitle }),
  ).toBeVisible();

  // The big button on Home goes to the same form
  await page.goto("/");
  await page
    .getByRole("link", { name: en.accounts.addFirst, exact: true })
    .click();
  await expect(page).toHaveURL(/\/accounts\/new$/);
});

test("accounts show a total per currency and one card per name, and a debt shows as owed", async ({
  page,
}) => {
  await signUpAndConfirm(page);

  await addAccount(page, { name: "Cash", amount: "1,500,000" });
  await expect(notice(page, en.accounts.notices.added)).toBeVisible();
  const totals = page.getByRole("region", { name: en.accounts.totalsLabel });
  await expect(totals.getByText("₭1,500,000", { exact: true })).toBeVisible();
  await expect(
    accountCard(page, "Cash").getByRole("heading", { level: 2 }),
  ).toHaveText("Cash");
  await expect(currencyRow(page, "Cash")).toContainText("₭1,500,000");

  // Home stops asking for a first account once there is one
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: en.home.startTitle }),
  ).toHaveCount(0);

  await page.goto("/accounts/new");
  await nameBox(page).fill("Visa");
  await currencyBox(page).selectOption("USD");
  await expect(page.getByLabel(en.accounts.form.startingAmount)).toBeVisible();
  // Retry the choice, in case it was made before the page was ready for it
  await expect(async () => {
    await typeBox(page).selectOption("bank");
    await typeBox(page).selectOption("credit_card");
    await expect(page.getByLabel(en.accounts.form.startingOwed)).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  await expect(page.getByLabel(en.accounts.form.startingAmount)).toHaveCount(0);
  await amountBox(page).fill("30");
  await submitNew(page).click();
  await expect(notice(page, en.accounts.notices.added)).toBeVisible();
  await expect(page).toHaveURL(/\/accounts$/);

  await expect(totals.getByText("-$30.00", { exact: true })).toBeVisible();
  await expect(currencyRow(page, "Visa", "USD")).toContainText("Owed $30.00");
  // The totals come first, then one card per name in name order
  const headings = await page
    .getByRole("heading", { level: 2 })
    .allTextContents();
  expect(headings).toEqual([en.accounts.totalsLabel, "Cash", "Visa"]);
});

test("editing changes the name and starting amount, and a taken name is refused", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,500,000" });

  await openAccount(page, "Cash");
  await expect(
    page.getByRole("heading", { level: 1, name: "Cash" }),
  ).toBeVisible();
  await expect(
    shown(page.getByText("₭1,500,000", { exact: true })),
  ).toBeVisible();
  await page.getByRole("link", { name: en.accounts.detail.edit }).click();
  await expect(page).toHaveURL(/\/edit$/);

  // The edit form is prefilled, and the currency can only be read
  await expect(nameBox(page)).toHaveValue("Cash");
  await expect(amountBox(page)).toHaveValue("1,500,000");
  await expect(currencyBox(page)).toHaveCount(0);
  await page
    .getByRole("button", {
      name: en.help.about.replace("{field}", en.accounts.form.currency),
    })
    .click();
  await expect(
    shown(page.getByText(en.accounts.form.currencyLocked)),
  ).toBeVisible();

  await nameBox(page).fill("Wallet cash");
  await amountBox(page).fill("2,000,000");
  await page.getByRole("button", { name: en.accounts.form.save }).click();
  await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
  await expect(notice(page, en.accounts.notices.saved)).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Wallet cash" }),
  ).toBeVisible();
  await expect(
    shown(page.getByText("₭2,000,000", { exact: true })),
  ).toBeVisible();

  // The same name in other letters and the same currency is still taken, and what was typed stays
  await page.goto("/accounts/new");
  await nameBox(page).fill("wallet cash");
  await typeBox(page).selectOption("bank");
  await currencyBox(page).selectOption("LAK");
  await amountBox(page).fill("5");
  await submitNew(page).click();
  await expect(
    shown(page.getByText(en.accounts.errors.name_taken)),
  ).toBeVisible();
  await expect(nameBox(page)).toHaveValue("wallet cash");
  await expect(typeBox(page)).toHaveValue("bank");
  await expect(currencyBox(page)).toHaveValue("LAK");
  await expect(amountBox(page)).toHaveValue("5");
});

test("the same bank in other currencies shows as one card, added from the account page", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "BCEL", type: "bank", amount: "1,000,000" });
  await openAccount(page, "BCEL");

  const otherCurrencies = page.getByRole("region", {
    name: en.accounts.otherCurrencies.replace("{name}", "BCEL"),
  });
  await expect(otherCurrencies.getByRole("link")).toHaveText([
    en.accounts.addCurrency.replace("{name}", "BCEL"),
  ]);
  await otherCurrencies.getByRole("link").click();

  // The add form starts with the name and type filled in, on a currency not used yet
  await expect(page).toHaveURL(/\/accounts\/new\?/);
  await expect(nameBox(page)).toHaveValue("BCEL");
  await expect(typeBox(page)).toHaveValue("bank");
  await expect(currencyBox(page)).not.toHaveValue("LAK");
  await currencyBox(page).selectOption("USD");
  await amountBox(page).fill("250");
  await submitNew(page).click();
  await expect(notice(page, en.accounts.notices.added)).toBeVisible();
  await expect(page).toHaveURL(/\/accounts$/);

  // One card with a row per currency
  const card = accountCard(page, "BCEL");
  await expect(card).toHaveCount(1);
  await expect(card.getByRole("link")).toContainText([
    en.currencies.LAK,
    en.currencies.USD,
  ]);
  const totals = page.getByRole("region", { name: en.accounts.totalsLabel });
  await expect(totals.getByText("₭1,000,000", { exact: true })).toBeVisible();
  await expect(totals.getByText("$250.00", { exact: true })).toBeVisible();

  // The kip account lists the dollar account, and still offers the third currency
  await openAccount(page, "BCEL");
  await expect(otherCurrencies.getByRole("link")).toContainText([
    en.currencies.USD,
    en.accounts.addCurrency.replace("{name}", "BCEL"),
  ]);

  // Where an account is picked, the shared name carries the currency
  await page.goto("/transactions/new");
  await expect(
    accountBox(page).locator("option", { hasText: "BCEL · ₭" }),
  ).toHaveCount(1);
  await expect(
    accountBox(page).locator("option", { hasText: "BCEL · $" }),
  ).toHaveCount(1);
});

function minimumBox(page: Page) {
  return page.getByRole("textbox", {
    name: en.accounts.form.minimum,
    exact: true,
  });
}

test("a bank account starts with the usual minimum, and its page shows what is free to spend", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await page.goto("/accounts/new");
  await nameBox(page).fill("BCEL");
  // Retry the choice, in case it was made before the page was ready for it
  await expect(async () => {
    await typeBox(page).selectOption("cash");
    await typeBox(page).selectOption("bank");
    await expect(minimumBox(page)).toHaveValue("50,000", { timeout: 1000 });
  }).toPass();

  // The default follows the currency until the person types their own
  await currencyBox(page).selectOption("USD");
  await expect(minimumBox(page)).toHaveValue("10.00");
  await currencyBox(page).selectOption("THB");
  await expect(minimumBox(page)).toHaveValue("500.00");
  await currencyBox(page).selectOption("LAK");
  await expect(minimumBox(page)).toHaveValue("50,000");
  await minimumBox(page).fill("100,000");
  await currencyBox(page).selectOption("USD");
  await expect(minimumBox(page)).toHaveValue("100,000");
  await currencyBox(page).selectOption("LAK");
  await minimumBox(page).fill("50,000");

  await amountBox(page).fill("7,000,000");
  await submitNew(page).click();
  await expect(notice(page, en.accounts.notices.added)).toBeVisible();
  await expect(currencyRow(page, "BCEL")).toContainText(
    en.accounts.freeLine.replace("{amount}", "₭6,950,000"),
  );

  await openAccount(page, "BCEL");
  await expect(
    shown(page.getByText(en.accounts.detail.minimum, { exact: true })),
  ).toBeVisible();
  await expect(shown(page.getByText("₭50,000", { exact: true }))).toBeVisible();
  await expect(
    shown(page.getByText(en.accounts.detail.free, { exact: true })),
  ).toBeVisible();
  await expect(
    shown(page.getByText("₭6,950,000", { exact: true })),
  ).toBeVisible();

  // The edit form is prefilled, a minus sign is refused, and 0 takes the minimum away
  await page.getByRole("link", { name: en.accounts.detail.edit }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await expect(minimumBox(page)).toHaveValue("50,000");
  await minimumBox(page).fill("-5");
  await page.getByRole("button", { name: en.accounts.form.save }).click();
  await expect(
    shown(page.getByText(en.accounts.errors.minimum_negative)),
  ).toBeVisible();
  await expect(minimumBox(page)).toHaveValue("-5");
  await minimumBox(page).fill("0");
  await page.getByRole("button", { name: en.accounts.form.save }).click();
  await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
  await expect(notice(page, en.accounts.notices.saved)).toBeVisible();
  await expect(
    shown(page.getByText(en.accounts.detail.minimum, { exact: true })),
  ).toHaveCount(0);
});

test("a credit card has no minimum box and shows no free to spend", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await page.goto("/accounts/new");
  await nameBox(page).fill("Visa");
  await currencyBox(page).selectOption("USD");
  await expect(async () => {
    await typeBox(page).selectOption("bank");
    await expect(minimumBox(page)).toBeVisible({ timeout: 1000 });
    await typeBox(page).selectOption("credit_card");
    await expect(minimumBox(page)).toBeHidden({ timeout: 1000 });
  }).toPass();
  await amountBox(page).fill("30");
  await submitNew(page).click();
  await expect(notice(page, en.accounts.notices.added)).toBeVisible();

  await expect(currencyRow(page, "Visa", "USD")).toContainText("Owed $30.00");
  await expect(currencyRow(page, "Visa", "USD")).not.toContainText(
    en.accounts.detail.free,
  );
  await openAccount(page, "Visa", "USD");
  await expect(
    shown(page.getByText(en.accounts.detail.minimum, { exact: true })),
  ).toHaveCount(0);
  await page.getByRole("link", { name: en.accounts.detail.edit }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await expect(page.getByLabel(en.accounts.form.startingOwed)).toBeVisible();
  await expect(minimumBox(page)).toBeHidden();
});

test("the form shows the server's messages for a bad name and a bad amount", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await page.goto("/accounts/new");

  await submitNew(page).click();
  await expect(
    shown(page.getByText(en.accounts.errors.name_required)),
  ).toBeVisible();

  await nameBox(page).fill("Dollars");
  await currencyBox(page).selectOption("USD");
  await amountBox(page).fill("1.005");
  await submitNew(page).click();
  await expect(
    shown(page.getByText(en.accounts.errors.amount_too_many_decimals)),
  ).toBeVisible();
  await amountBox(page).fill("-5");
  await submitNew(page).click();
  await expect(
    shown(page.getByText(en.accounts.errors.amount_negative)),
  ).toBeVisible();
  await amountBox(page).fill("abc");
  await submitNew(page).click();
  await expect(
    shown(page.getByText(en.accounts.errors.amount_invalid)),
  ).toBeVisible();
  await expect(nameBox(page)).toHaveValue("Dollars");
});

test("an account can be archived in two steps and brought back", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,500,000" });
  await openAccount(page, "Cash");

  // Cancelling the confirmation changes nothing
  await page.getByRole("button", { name: en.accounts.detail.archive }).click();
  await expect(
    shown(page.getByText(en.accounts.detail.archiveConfirm)),
  ).toBeVisible();
  await page.getByRole("button", { name: en.accounts.form.cancel }).click();
  await expect(
    page.getByRole("button", { name: en.accounts.detail.archive }),
  ).toBeVisible();

  await page.getByRole("button", { name: en.accounts.detail.archive }).click();
  await page
    .getByRole("button", { name: en.accounts.detail.archiveYes })
    .click();
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(notice(page, en.accounts.notices.archived)).toBeVisible();
  await expect(accountCard(page, "Cash")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: en.accounts.emptyTitle }),
  ).toBeVisible();

  await page
    .getByRole("link", {
      name: en.accounts.showArchived.replace("{count}", "1"),
    })
    .click();
  await expect(page).toHaveURL(/\/accounts\?archived=1$/);
  await expect(
    page.getByRole("heading", { level: 2, name: en.accounts.archivedTitle }),
  ).toBeVisible();
  await followToAccount(
    page,
    page
      .getByRole("region", { name: en.accounts.archivedTitle })
      .getByRole("link", { name: /Cash.*₭1,500,000/ }),
  );

  await page
    .getByRole("button", { name: en.accounts.detail.unarchive })
    .click();
  await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("button", { name: en.accounts.detail.archive }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: en.accounts.detail.unarchive }),
  ).toHaveCount(0);

  await page.goto("/accounts");
  await expect(currencyRow(page, "Cash")).toContainText("₭1,500,000");
  await expect(page.getByRole("link", { name: /^Show archived/ })).toHaveCount(
    0,
  );
});

test("bringing back an account whose name is now taken explains what to do", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100" });
  const oldId = await openAccount(page, "Cash");
  await page.getByRole("button", { name: en.accounts.detail.archive }).click();
  await page
    .getByRole("button", { name: en.accounts.detail.archiveYes })
    .click();
  await expect(page).toHaveURL(/\/accounts$/);

  await addAccount(page, { name: "Cash", amount: "200" });
  await page.goto(`/accounts/${oldId}`);
  await page
    .getByRole("button", { name: en.accounts.detail.unarchive })
    .click();
  await expect(page).toHaveURL(/notice=unarchive_name_taken$/);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: en.accounts.notices.unarchive_name_taken }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: en.accounts.detail.unarchive }),
  ).toBeVisible();
});

test("another person's account, and an id that is not a uuid, give not found", async ({
  page,
  browser,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,500,000" });
  const id = await openAccount(page, "Cash");

  const other = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const stranger = await other.newPage();
  await signUpAndConfirm(stranger);

  const notFound = en.problem.notFoundTitle;
  for (const path of [
    `/accounts/${id}`,
    `/accounts/${id}/edit`,
    "/accounts/not-a-uuid",
  ]) {
    await stranger.goto(path);
    await expect(shown(stranger.getByText(notFound))).toBeVisible();
    await expect(stranger.getByRole("heading", { name: "Cash" })).toHaveCount(
      0,
    );
  }
  await other.close();

  // The owner still sees it
  await page.goto(`/accounts/${id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Cash" }),
  ).toBeVisible();
});

test("the accounts pages fit every width and the nav never covers the last element", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await signUpAndConfirm(page);
  await addAccount(page, {
    name: "A very long account name that keeps going and going",
    amount: "123,456,789,012",
  });
  await addAccount(page, {
    name: "Visa",
    type: "credit_card",
    currency: "USD",
    amount: "1234567.89",
  });

  const paths = [
    {
      path: "/accounts",
      ready: () => page.getByText(en.accounts.totalsLabel).first(),
    },
    { path: "/accounts/new", ready: () => submitNew(page) },
  ];

  for (const { path, ready } of paths) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await expect(ready()).toBeVisible();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const lastBottom = await page.evaluate(() => {
        let element: Element | null = document.querySelector("main");
        while (element?.lastElementChild) element = element.lastElementChild;
        return element?.getBoundingClientRect().bottom ?? 0;
      });
      const navBox = await mainNav(page).boundingBox();
      if (width < 1024) {
        expect(lastBottom, `${path} at ${width}px`).toBeLessThanOrEqual(
          navBox?.y ?? 0,
        );
      } else {
        expect(lastBottom, `${path} at ${width}px`).toBeLessThanOrEqual(800);
      }
    }
  }
});
