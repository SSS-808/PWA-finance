import {
  expect as baseExpect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";
import { en } from "../../src/messages/en";
import {
  accountBox,
  addAccount,
  addEntry,
  amountBox,
  chip,
  dateBox,
  fillEntry,
  noteBox,
  openAddForm,
  saveButton,
  signUpAndConfirm,
  waitForSaved,
} from "./helpers";

test.describe.configure({ timeout: 90_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

const widths = [320, 390, 768, 1024, 1280, 1440];
const UUID = "[0-9a-f-]{36}";

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

function today(): string {
  return dayInVientiane(0);
}

// New users get the Asia/Vientiane time zone, so days are counted there
function dayInVientiane(daysAgo: number): string {
  const moment = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Vientiane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(moment);
}

test("adding an expense from Accounts comes back with a note and moves the balance", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,500,000" });

  await mainNav(page).getByRole("link", { name: en.nav.add }).click();
  await expect(page).toHaveURL(/\/transactions\/new\?from=%2Faccounts$/);
  await expect(
    page.getByRole("heading", { level: 1, name: en.transactions.addTitle }),
  ).toBeVisible();
  await expect(amountBox(page)).toBeFocused();
  // Nothing is preselected, so a category has to be a real choice
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(dateBox(page)).toHaveValue(today());

  await amountBox(page).fill("45,000");
  await chip(page, "Food").check();
  await saveButton(page).click();

  await expect(page).toHaveURL(/\/accounts$/);
  await expect(notice(page, "Saved: Food ₭45,000")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Cash.*₭1,455,000/ }),
  ).toBeVisible();
});

test("saving after opening Add from Settings lands on History, where the note shows", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000" });
  await openAddForm(page, "/transactions/new?from=%2Fsettings");
  await fillEntry(page, { amount: "100", category: "Food" });
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(notice(page, "Saved: Food ₭100")).toBeVisible();
});

test("the History list shows the entry under Today with its sign", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,500,000" });
  await addEntry(page, { amount: "45,000", category: "Food" });

  await mainNav(page).getByRole("link", { name: en.nav.history }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(
    mainNav(page).getByRole("link", { name: en.nav.history }),
  ).toHaveAttribute("aria-current", "page");
  const day = page.getByRole("region", { name: en.transactions.today });
  await expect(day.getByRole("link", { name: /Food.*-₭45,000/ })).toBeVisible();
  // The starting amount is listed too, but is not a link
  await expect(
    day.getByText(en.transactions.kinds.opening_balance),
  ).toBeVisible();
  await expect(
    day.getByRole("link", {
      name: new RegExp(en.transactions.kinds.opening_balance),
    }),
  ).toHaveCount(0);
});

test("an entry can be edited and then deleted in two steps", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,500,000" });
  await addEntry(page, { amount: "45,000", category: "Food" });

  await page.goto("/transactions");
  await page.getByRole("link", { name: /Food.*-₭45,000/ }).click();
  await expect(page).toHaveURL(new RegExp(`/transactions/${UUID}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: en.transactions.editTitle }),
  ).toBeVisible();
  // The form is prefilled, with the amount written without a sign
  await expect(amountBox(page)).toHaveValue("45,000");
  await expect(chip(page, "Food")).toBeChecked();
  await expect(
    page.getByRole("button", { name: en.transactions.kinds.expense }),
  ).toHaveAttribute("aria-pressed", "true");

  await amountBox(page).fill("50,000");
  await saveButton(page).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(notice(page, "Saved: Food ₭50,000")).toBeVisible();
  // Opening the same entry again from the list shows what was saved
  await page.getByRole("link", { name: /Food.*-₭50,000/ }).click();
  await expect(page).toHaveURL(new RegExp(`/transactions/${UUID}$`));
  await expect(amountBox(page)).toHaveValue("50,000");
  await expect(chip(page, "Food")).toBeChecked();

  await page.goto("/accounts");
  await expect(
    page.getByRole("link", { name: /Cash.*₭1,450,000/ }),
  ).toBeVisible();

  await page.goto("/transactions");
  await page.getByRole("link", { name: /Food.*-₭50,000/ }).click();
  // Cancelling the confirmation changes nothing
  await page.getByRole("button", { name: en.transactions.delete }).click();
  await expect(
    shown(page.getByText(en.transactions.deleteConfirm)),
  ).toBeVisible();
  await page.getByRole("button", { name: en.transactions.cancel }).click();
  await expect(
    page.getByRole("button", { name: en.transactions.delete }),
  ).toBeVisible();

  await page.getByRole("button", { name: en.transactions.delete }).click();
  await page.getByRole("button", { name: en.transactions.deleteYes }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(notice(page, en.transactions.deleted)).toBeVisible();
  await expect(page.getByRole("link", { name: /Food/ })).toHaveCount(0);

  await page.goto("/accounts");
  await expect(
    page.getByRole("link", { name: /Cash.*₭1,500,000/ }),
  ).toBeVisible();
});

test("income shows a plus sign, and switching the kind swaps the categories", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100" });
  await openAddForm(page);

  await expect(chip(page, "Food")).toBeVisible();
  await expect(chip(page, "Salary")).toHaveCount(0);
  // A pick made before the switch must not survive it
  await chip(page, "Food").check();
  await page
    .getByRole("button", { name: en.transactions.kinds.income })
    .click();
  await expect(chip(page, "Salary")).toBeVisible();
  await expect(chip(page, "Food")).toHaveCount(0);
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);

  await amountBox(page).fill("8,000,000");
  await chip(page, "Salary").check();
  await saveButton(page).click();
  await expect(notice(page, "Saved: Salary ₭8,000,000")).toBeVisible();

  await page.goto("/transactions");
  await expect(
    page.getByRole("link", { name: /Salary.*\+₭8,000,000/ }),
  ).toBeVisible();
});

test("a past date and a note are saved and listed under Yesterday", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100" });
  await addEntry(page, {
    amount: "20,000",
    category: "Shopping",
    date: dayInVientiane(1),
    note: "Lunch with Sai",
  });

  await page.goto("/transactions");
  const yesterday = page.getByRole("region", {
    name: en.transactions.yesterday,
  });
  const row = yesterday.getByRole("link", { name: /Shopping.*-₭20,000/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Lunch with Sai");
  await expect(row).toContainText("Cash");

  await row.click();
  await expect(noteBox(page)).toHaveValue("Lunch with Sai");
  await expect(dateBox(page)).toHaveValue(dayInVientiane(1));
});

test("the account used last is preselected next time", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100" });
  await addAccount(page, { name: "BCEL", amount: "100" });

  await openAddForm(page);
  // The first account by name is the default until another one is used
  await expect(accountBox(page).locator("option:checked")).toHaveText("BCEL");
  await accountBox(page).selectOption({ label: "Cash" });
  await amountBox(page).fill("1,000");
  await chip(page, "Food").check();
  await saveButton(page).click();
  await waitForSaved(page);

  await openAddForm(page);
  await expect(accountBox(page).locator("option:checked")).toHaveText("Cash");
  await accountBox(page).selectOption({ label: "BCEL" });
  await amountBox(page).fill("2,000");
  await chip(page, "Food").check();
  await saveButton(page).click();
  await waitForSaved(page);

  // A client-side visit gets a fresh form, not the one left over from the last save
  await mainNav(page).getByRole("link", { name: en.nav.add }).click();
  await expect(accountBox(page).locator("option:checked")).toHaveText("BCEL");
  await expect(amountBox(page)).toHaveValue("");
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
});

test("the most-used category comes first", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100" });

  await openAddForm(page);
  // Without any history the chips are in alphabetical order
  await expect(page.getByRole("radio").first()).toHaveAccessibleName("Bills");

  await addEntry(page, { amount: "1,000", category: "Transportation" });
  await addEntry(page, { amount: "2,000", category: "Transportation" });
  await addEntry(page, { amount: "3,000", category: "Food" });

  await openAddForm(page);
  await expect(chip(page, "Transportation")).toBeVisible();
  const names = await page
    .getByRole("radio")
    .evaluateAll((inputs) =>
      inputs.map((input) => input.closest("label")?.textContent ?? ""),
    );
  expect(names.slice(0, 3)).toEqual(["Transportation", "Food", "Bills"]);
});

test("the form answers before it calls the server, and the server still checks", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100" });
  await openAddForm(page);

  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });

  await saveButton(page).click();
  await expect(
    shown(page.getByText(en.transactions.errors.amount_required)),
  ).toBeVisible();
  await expect(
    shown(page.getByText(en.transactions.errors.category_required)),
  ).toBeVisible();

  await amountBox(page).fill("abc");
  await saveButton(page).click();
  await expect(
    shown(page.getByText(en.transactions.errors.amount_invalid)),
  ).toBeVisible();

  // Only the category is missing now
  await amountBox(page).fill("1,000");
  await saveButton(page).click();
  await expect(
    shown(page.getByText(en.transactions.errors.amount_required)),
  ).toHaveCount(0);
  await expect(
    shown(page.getByText(en.transactions.errors.category_required)),
  ).toBeVisible();
  expect(posts).toEqual([]);

  // Kip has no decimals; only the server knows the account's currency
  await amountBox(page).fill("1000.5");
  await chip(page, "Food").check();
  await saveButton(page).click();
  await expect(
    shown(page.getByText(en.transactions.errors.amount_too_many_decimals)),
  ).toBeVisible();
  await expect(amountBox(page)).toHaveValue("1,000.5");
  await expect(chip(page, "Food")).toBeChecked();
  await expect(page).toHaveURL(/\/transactions\/new/);
});

test("a user with no accounts is asked to add one first", async ({ page }) => {
  await signUpAndConfirm(page);
  await page.goto("/transactions/new");
  await expect(
    page.getByRole("link", { name: en.accounts.addFirst, exact: true }),
  ).toBeVisible();
  await expect(amountBox(page)).toHaveCount(0);
});

test("another person's entry, and an id that is not a uuid, give not found", async ({
  page,
  browser,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100" });
  await addEntry(page, { amount: "1,000", category: "Food" });
  await page.goto("/transactions");
  await page.getByRole("link", { name: /Food/ }).click();
  await expect(page).toHaveURL(new RegExp(`/transactions/${UUID}$`));
  const id = page.url().split("/").pop() ?? "";

  const other = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
  });
  const stranger = await other.newPage();
  await signUpAndConfirm(stranger);

  const notFound = "This page could not be found.";
  for (const path of [`/transactions/${id}`, "/transactions/not-a-uuid"]) {
    await stranger.goto(path);
    await expect(shown(stranger.getByText(notFound))).toBeVisible();
    await expect(amountBox(stranger)).toHaveCount(0);
  }
  await other.close();

  // The owner still sees it
  await page.goto(`/transactions/${id}`);
  await expect(amountBox(page)).toHaveValue("1,000");
});

test("a deleted entry can no longer be opened", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100" });
  await addEntry(page, { amount: "1,000", category: "Food" });
  await page.goto("/transactions");
  await page.getByRole("link", { name: /Food/ }).click();
  const id = page.url().split("/").pop() ?? "";
  await page.getByRole("button", { name: en.transactions.delete }).click();
  await page.getByRole("button", { name: en.transactions.deleteYes }).click();
  await expect(page).toHaveURL(/\/transactions$/);

  await page.goto(`/transactions/${id}`);
  await expect(
    shown(page.getByText("This page could not be found.")),
  ).toBeVisible();
});

test("History and Add fit every width and the nav never covers the last element", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await signUpAndConfirm(page);
  await addAccount(page, {
    name: "A very long account name that keeps going and going",
    amount: "123,456,789,012",
  });
  await addEntry(page, {
    amount: "1,234,567,890",
    category: "Entertainment",
    note: "A very long note that keeps going and going and going and going",
  });
  await addEntry(page, {
    amount: "8,000,000",
    category: "Salary",
    kind: "income",
  });

  const paths = [
    {
      path: "/transactions",
      ready: () => page.getByRole("link", { name: /Entertainment/ }),
    },
    { path: "/transactions/new", ready: () => saveButton(page) },
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

test("the saved toast shows and goes away by itself", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100,000" });
  await openAddForm(page);
  await fillEntry(page, { amount: "45,000", category: "Food" });

  const toast = notice(page, "Saved: Food ₭45,000");
  await expect(toast).toBeVisible();
  await expect(toast).toHaveCount(0, { timeout: 6000 });
});

test("the toast fits inside the screen at every width", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100,000" });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await openAddForm(page);
    await fillEntry(page, { amount: "1,000", category: "Food" });
    const toast = notice(page, "Saved: Food ₭1,000");
    await expect(toast).toBeVisible();
    // The toast slides in, so wait until it has settled inside the screen
    await expect
      .poll(async () => {
        const box = await toast.boundingBox();
        return box !== null && box.x >= 0 && box.x + box.width <= width;
      })
      .toBe(true);
    const box = await toast.boundingBox();
    console.log(
      `toast at ${width}px: left ${box?.x}, right ${(box?.x ?? 0) + (box?.width ?? 0)}, width ${box?.width}`,
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `page at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test("typing an amount one key at a time adds commas and saves the right value", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000" });
  await openAddForm(page);

  await amountBox(page).pressSequentially("1234567");
  await expect(amountBox(page)).toHaveValue("1,234,567");
  await chip(page, "Food").check();
  await saveButton(page).click();
  await waitForSaved(page);

  await page.goto("/transactions");
  await expect(
    page.getByRole("link", { name: /Food.*-₭1,234,567/ }),
  ).toBeVisible();
});

test("a dollar amount keeps its decimals while commas are added", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Wallet", currency: "USD", amount: "10" });
  await openAddForm(page);

  await amountBox(page).pressSequentially("1234.5");
  await expect(amountBox(page)).toHaveValue("1,234.5");
  await chip(page, "Food").check();
  await saveButton(page).click();
  await waitForSaved(page);

  await page.goto("/transactions");
  await expect(
    page.getByRole("link", { name: /Food.*-\$1,234\.50/ }),
  ).toBeVisible();
});

test("the cursor stays in place when commas move", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000" });
  await openAddForm(page);

  const box = amountBox(page);
  await box.pressSequentially("1234567");
  await expect(box).toHaveValue("1,234,567");
  for (let i = 0; i < 4; i++) await box.press("ArrowLeft");
  await box.press("Backspace");
  await expect(box).toHaveValue("123,567");
  await box.pressSequentially("9");
  await expect(box).toHaveValue("1,239,567");
});
