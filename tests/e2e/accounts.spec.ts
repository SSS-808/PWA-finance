import { expect, test, type Locator, type Page } from "@playwright/test";
import { en } from "../../src/messages/en";
import { signUpAndConfirm } from "./helpers";

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
  return page.getByRole("status").filter({ hasText: message });
}

function submitNew(page: Page) {
  return page.getByRole("button", { name: en.accounts.form.submitNew });
}

async function addAccount(page: Page, account: NewAccount) {
  await page.goto("/accounts/new");
  await nameBox(page).fill(account.name);
  await typeBox(page).selectOption(account.type ?? "cash");
  await currencyBox(page).selectOption(account.currency ?? "LAK");
  if (account.amount) await amountBox(page).fill(account.amount);
  await submitNew(page).click();
  await expect(page).toHaveURL(/\/accounts\?notice=added$/);
}

function accountLink(scope: Page | Locator, name: string | RegExp) {
  return scope.getByRole("link", { name });
}

// Opens an account from the list and returns its id
async function openAccount(page: Page, name: RegExp): Promise<string> {
  await accountLink(page, name).click();
  await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop() ?? "";
}

test("a new user sees the empty state on Home and on Accounts", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await expect(
    page.getByRole("heading", { name: en.home.startTitle }),
  ).toBeVisible();
  await expect(shown(page.getByText(en.home.startBody))).toBeVisible();

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

test("accounts are grouped by currency with a total, and a debt shows as owed", async ({
  page,
}) => {
  await signUpAndConfirm(page);

  await addAccount(page, { name: "Cash", amount: "1,500,000" });
  await expect(notice(page, en.accounts.notices.added)).toBeVisible();
  const kip = page.getByRole("region", { name: en.currencies.LAK });
  await expect(kip.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(accountLink(kip, /Cash.*₭1,500,000/)).toBeVisible();
  await expect(kip.getByText(en.accounts.total).locator("..")).toHaveText(
    /^Total\s*₭1,500,000$/,
  );

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
  await expect(page).toHaveURL(/\/accounts\?notice=added$/);

  const dollars = page.getByRole("region", { name: en.currencies.USD });
  await expect(accountLink(dollars, /Visa.*\$30\.00 owed/)).toBeVisible();
  await expect(dollars.getByText(en.accounts.total).locator("..")).toHaveText(
    /^Total\s*-\$30\.00$/,
  );
  // Kip comes before dollars, whatever the order they were added in
  const headings = await page
    .getByRole("heading", { level: 2 })
    .allTextContents();
  expect(headings).toEqual([en.currencies.LAK, en.currencies.USD]);
});

test("editing changes the name and starting amount, and a taken name is refused", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,500,000" });

  await openAccount(page, /Cash.*₭1,500,000/);
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
  await expect(amountBox(page)).toHaveValue("1500000");
  await expect(currencyBox(page)).toHaveCount(0);
  await expect(
    shown(page.getByText(en.accounts.form.currencyLocked)),
  ).toBeVisible();

  await nameBox(page).fill("Wallet cash");
  await amountBox(page).fill("2,000,000");
  await page.getByRole("button", { name: en.accounts.form.submitEdit }).click();
  await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}\?notice=saved$/);
  await expect(notice(page, en.accounts.notices.saved)).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Wallet cash" }),
  ).toBeVisible();
  await expect(
    shown(page.getByText("₭2,000,000", { exact: true })),
  ).toBeVisible();

  // The same name in other letters is still taken, and what was typed stays
  await page.goto("/accounts/new");
  await nameBox(page).fill("wallet cash");
  await typeBox(page).selectOption("bank");
  await currencyBox(page).selectOption("USD");
  await amountBox(page).fill("5");
  await submitNew(page).click();
  await expect(
    shown(page.getByText(en.accounts.errors.name_taken)),
  ).toBeVisible();
  await expect(nameBox(page)).toHaveValue("wallet cash");
  await expect(typeBox(page)).toHaveValue("bank");
  await expect(currencyBox(page)).toHaveValue("USD");
  await expect(amountBox(page)).toHaveValue("5");
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
  await openAccount(page, /Cash.*₭1,500,000/);

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
  await expect(page).toHaveURL(/\/accounts\?notice=archived$/);
  await expect(notice(page, en.accounts.notices.archived)).toBeVisible();
  await expect(accountLink(page, /Cash/)).toHaveCount(0);
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
  await openAccount(page, /Cash.*₭1,500,000/);

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
  await expect(accountLink(page, /Cash.*₭1,500,000/)).toBeVisible();
  await expect(page.getByRole("link", { name: /^Show archived/ })).toHaveCount(
    0,
  );
});

test("bringing back an account whose name is now taken explains what to do", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100" });
  const oldId = await openAccount(page, /Cash.*₭100/);
  await page.getByRole("button", { name: en.accounts.detail.archive }).click();
  await page
    .getByRole("button", { name: en.accounts.detail.archiveYes })
    .click();
  await expect(page).toHaveURL(/\/accounts\?notice=archived$/);

  await addAccount(page, { name: "Cash", amount: "200" });
  await page.goto(`/accounts/${oldId}`);
  await page
    .getByRole("button", { name: en.accounts.detail.unarchive })
    .click();
  await expect(page).toHaveURL(/notice=unarchive_name_taken$/);
  await expect(
    notice(page, en.accounts.notices.unarchive_name_taken),
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
  const id = await openAccount(page, /Cash.*₭1,500,000/);

  const other = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const stranger = await other.newPage();
  await signUpAndConfirm(stranger);

  const notFound = "This page could not be found.";
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
      ready: () => page.getByText(en.accounts.total).first(),
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
