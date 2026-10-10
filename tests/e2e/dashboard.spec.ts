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
  return shown(page.getByRole("region", { name: en.currencies[currency] }));
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
  await expect(stat(lak, en.dashboard.income)).toHaveText("+₭8,000,000");
  await expect(stat(lak, en.dashboard.spending)).toHaveText("₭395,000");
  await expect(stat(lak, en.dashboard.saved)).toHaveText("₭7,605,000");
  await expect(stat(lak, en.dashboard.savingsRate)).toHaveText("95%");
  await expect(
    lak
      .getByText(en.dashboard.totalBalance)
      .locator("xpath=following-sibling::p"),
  ).toHaveText("₭8,605,000");
  await expect(lak.getByRole("link", { name: /Bills/ })).toBeVisible();
  await expect(lak.getByRole("link", { name: /Food/ })).toBeVisible();
});

test("a category bar opens History for it, and an empty month says so", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addEntry(page, { amount: "45,000", category: "Food" });
  await addEntry(page, { amount: "350,000", category: "Bills" });

  await page.goto("/");
  await card(page, "LAK").getByRole("link", { name: /Bills/ }).click();
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
    card(page, "LAK").getByRole("link", { name: /Bills/ }),
  ).toHaveCount(0);
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
