import {
  expect as baseExpect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";
import { en } from "../../src/messages/en";
import { addAccount, addEntry, addTransfer, signUpAndConfirm } from "./helpers";

test.describe.configure({ timeout: 180_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

const widths = [320, 390, 768, 1024, 1280, 1440];

// Next.js keeps a hidden copy of the previous page, so lookups must only count what is on screen
function shown(locator: Locator) {
  return locator.filter({ visible: true });
}

function mainNav(page: Page) {
  return page.getByRole("navigation", { name: en.nav.label });
}

// The dashboard card of one currency
function card(page: Page, currency: keyof typeof en.currencies) {
  return shown(
    page.getByRole("region", { name: en.currencies[currency], exact: true }),
  );
}

// The "Where your money went" card of one currency
function spending(page: Page, currency: keyof typeof en.currencies) {
  return shown(
    page.getByRole("region", {
      name: `${en.dashboard.whereMoneyWent} ${en.currencies[currency]}`,
      exact: true,
    }),
  );
}

// The value that sits next to a label in a card
function stat(cardBox: Locator, label: string) {
  return cardBox
    .getByText(label, { exact: true })
    .locator("xpath=following-sibling::dd");
}

test("the card shows this month's numbers and the transfer changes none of them", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addAccount(page, { name: "BCEL", type: "bank" });
  await addEntry(page, {
    kind: "income",
    amount: "8,000,000",
    category: "Salary",
    account: "BCEL",
  });
  await addEntry(page, { amount: "45,000", category: "Food", account: "Cash" });
  await addEntry(page, {
    amount: "350,000",
    category: "Bills",
    account: "Cash",
  });
  await addTransfer(page, { from: "BCEL", to: "Cash", amount: "500,000" });

  await page.goto("/");
  const lak = card(page, "LAK");
  await expect(stat(lak, en.dashboard.income)).toHaveText("+₭8,000,000.00");
  await expect(stat(lak, en.dashboard.spending)).toHaveText("₭395,000.00");
  await expect(stat(lak, en.dashboard.saved)).toHaveText("₭7,605,000.00");
  await expect(stat(lak, en.dashboard.savingsRate)).toHaveText("95%");
  await expect(lak.getByText("₭8,605,000.00", { exact: true })).toBeVisible();
  const lakSpending = spending(page, "LAK");
  await expect(lakSpending.getByRole("link", { name: /Bills/ })).toBeVisible();
  await expect(lakSpending.getByRole("link", { name: /Food/ })).toBeVisible();
  await expect(
    lakSpending
      .getByRole("link", { name: /Food/ })
      .locator("svg.lucide-utensils"),
  ).toBeVisible();
  const recent = shown(
    page.getByRole("region", { name: en.dashboard.recent, exact: true }),
  );
  await expect(
    recent.getByRole("link", { name: /Food/ }).locator("svg.lucide-utensils"),
  ).toBeVisible();
});

test("a category bar opens History for it, and an empty month says so", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addEntry(page, { amount: "45,000", category: "Food" });
  await addEntry(page, { amount: "350,000", category: "Bills" });

  await page.goto("/");
  await spending(page, "LAK").getByRole("link", { name: /Bills/ }).click();
  await expect(page).toHaveURL(
    /\/transactions\?month=\d{4}-\d{2}&category=[0-9a-f-]{36}&type=expense$/,
  );
  await expect(page.getByRole("link", { name: /Bills/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Food/ })).toHaveCount(0);

  await page.goto("/");
  await page
    .getByRole("link", { name: en.transactions.filters.previousMonth })
    .click();
  const { noSpending } = en.dashboard;
  const start = noSpending.slice(0, noSpending.indexOf("{month}"));
  await expect(shown(page.getByText(start))).toBeVisible();
  await expect(
    spending(page, "LAK").getByRole("link", { name: /Bills/ }),
  ).toHaveCount(0);
});

test("the main currency's card comes first, and Home has no Money In or Money Out buttons", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addAccount(page, {
    name: "Dollars",
    type: "bank",
    currency: "USD",
    amount: "1,234.50",
  });

  // The cards sit side by side, so the first one is the leftmost
  async function left(currency: keyof typeof en.currencies) {
    const box = await card(page, currency).boundingBox();
    return box?.x ?? Number.NaN;
  }

  await page.goto("/");
  await expect(card(page, "USD")).toBeVisible();
  expect(await left("LAK")).toBeLessThan(await left("USD"));

  await page.goto("/settings");
  await page
    .getByRole("combobox", { name: en.settings.profile.baseCurrency })
    .selectOption("USD");
  await page.getByRole("button", { name: en.settings.profile.submit }).click();
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: en.settings.profile.saved }),
  ).toBeVisible();

  await page.goto("/");
  await expect(card(page, "LAK")).toBeVisible();
  expect(await left("USD")).toBeLessThan(await left("LAK"));

  await expect(shown(page.getByRole("link", { name: "Money In" }))).toHaveCount(
    0,
  );
  await expect(
    shown(page.getByRole("link", { name: "Money Out" })),
  ).toHaveCount(0);
});

// The dot that brings one currency's card into view
function dot(page: Page, currency: keyof typeof en.currencies) {
  return shown(
    page.getByRole("button", {
      name: en.dashboard.showCard.replace(
        "{currency}",
        () => en.currencies[currency],
      ),
      exact: true,
    }),
  );
}

test("a dot or a swipe brings the other currency's card into view", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addAccount(page, {
    name: "Dollars",
    type: "bank",
    currency: "USD",
    amount: "1,234.50",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // Whole card on screen, give or take a pixel of rounding
  async function inView(currency: keyof typeof en.currencies) {
    const box = await card(page, currency).boundingBox();
    return box !== null && box.x >= -1 && box.x + box.width <= 391;
  }

  await expect(dot(page, "LAK")).toHaveAttribute("aria-current", "true");
  expect(await inView("LAK")).toBe(true);
  expect(await inView("USD")).toBe(false);

  await dot(page, "USD").click();
  await expect.poll(() => inView("USD")).toBe(true);
  await expect(dot(page, "USD")).toHaveAttribute("aria-current", "true");
  await expect(dot(page, "LAK")).not.toHaveAttribute("aria-current");

  // A swipe scrolls the row sideways, and the dots follow it
  await shown(
    page.getByRole("region", { name: en.dashboard.balances, exact: true }),
  ).evaluate((row) => row.scrollTo({ left: 0 }));
  await expect(dot(page, "LAK")).toHaveAttribute("aria-current", "true");
  await expect.poll(() => inView("LAK")).toBe(true);
});

test("a single currency shows its card without dots", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await page.goto("/");

  await expect(card(page, "LAK")).toBeVisible();
  await expect(dot(page, "LAK")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: en.dashboard.balances, exact: true }),
  ).toHaveCount(0);
});

test("an account switched off stays out of Home but shows on Accounts, and can be switched back on", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addAccount(page, {
    name: "LDB",
    type: "bank",
    amount: "500,000",
    showOnHome: false,
  });
  await addAccount(page, {
    name: "Dong",
    currency: "VND",
    amount: "50,000.50",
    showOnHome: false,
  });
  await addEntry(page, { amount: "45,000", category: "Food", account: "Cash" });
  await addEntry(page, { amount: "1,000", category: "Bills", account: "LDB" });
  await addEntry(page, {
    amount: "1,000.25",
    category: "Shopping",
    account: "Dong",
  });

  await page.goto("/accounts");
  await expect(shown(page.getByText("₫49,000.25")).first()).toBeVisible();

  await page.goto("/");
  const lak = card(page, "LAK");
  await expect(lak.getByText("₭955,000.00", { exact: true })).toBeVisible();
  await expect(stat(lak, en.dashboard.spending)).toHaveText("₭45,000.00");
  await expect(card(page, "VND")).toHaveCount(0);
  await expect(spending(page, "VND")).toHaveCount(0);
  const recent = shown(
    page.getByRole("region", { name: en.dashboard.recent, exact: true }),
  );
  await expect(recent.getByRole("link", { name: /Food/ })).toBeVisible();
  await expect(recent.getByRole("link", { name: /Bills/ })).toHaveCount(0);

  await page.goto("/accounts");
  await shown(page.getByRole("link", { name: /LDB/ }))
    .first()
    .click();
  await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
  await page.getByRole("link", { name: en.accounts.detail.edit }).click();
  await expect(page).toHaveURL(/\/edit$/);
  const toggle = page.getByRole("switch", {
    name: en.accounts.form.showOnHome,
    exact: true,
  });
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await page.getByRole("button", { name: en.accounts.form.save }).click();
  await expect(page).toHaveURL(/notice=saved/);

  await page.goto("/");
  await expect(lak.getByText("₭1,454,000.00", { exact: true })).toBeVisible();
  await expect(stat(lak, en.dashboard.spending)).toHaveText("₭46,000.00");
});

test("when every account is switched off, Home says so and points to Accounts", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, {
    name: "Cash",
    amount: "1,000,000",
    showOnHome: false,
  });

  await page.goto("/");
  await expect(
    shown(page.getByRole("heading", { name: en.home.noneShownTitle })),
  ).toBeVisible();
  await expect(card(page, "LAK")).toHaveCount(0);
  await shown(
    page.getByRole("link", { name: en.home.noneShownAction }),
  ).click();
  await expect(page).toHaveURL(/\/accounts$/);
});

test("home fits every width and the nav never covers the last element", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addAccount(page, {
    name: "Dollars",
    type: "bank",
    currency: "USD",
    amount: "1,234.50",
  });
  await addEntry(page, { amount: "45,000", category: "Food", account: "Cash" });
  await addEntry(page, {
    amount: "350,000",
    category: "Bills",
    account: "Cash",
  });
  await addEntry(page, {
    amount: "12.50",
    category: "Food",
    account: "Dollars",
  });

  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(
      shown(page.getByRole("link", { name: en.dashboard.seeAll })),
    ).toBeVisible();
    await expect(card(page, "USD")).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `/ at ${width}px`).toBeLessThanOrEqual(0);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const lastBottom = await page.evaluate(() => {
      let element: Element | null = document.querySelector("main");
      while (element?.lastElementChild) element = element.lastElementChild;
      return element?.getBoundingClientRect().bottom ?? 0;
    });
    const navBox = await mainNav(page).boundingBox();
    if (width < 1024) {
      expect(lastBottom, `/ at ${width}px`).toBeLessThanOrEqual(navBox?.y ?? 0);
    } else {
      expect(lastBottom, `/ at ${width}px`).toBeLessThanOrEqual(800);
    }
  }
});
