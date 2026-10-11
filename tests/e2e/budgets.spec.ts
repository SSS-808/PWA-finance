import {
  expect as baseExpect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";
import { en } from "../../src/messages/en";
import { addAccount, addEntry, signUpAndConfirm } from "./helpers";

test.describe.configure({ timeout: 180_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

const widths = [320, 390, 768, 1024, 1280, 1440];

// Next.js keeps a hidden copy of the previous page, so lookups must only count what is on screen
function shown(locator: Locator) {
  return locator.filter({ visible: true });
}

function toast(page: Page, message: string) {
  return page.locator("[data-sonner-toast]").filter({ hasText: message });
}

// The list item of one category on the Budgets page
function line(page: Page, name: string) {
  return shown(page.getByRole("listitem")).filter({ hasText: name });
}

function amountBox(page: Page) {
  return page.getByRole("textbox", {
    name: en.budgets.form.amount,
    exact: true,
  });
}

function saveButton(page: Page) {
  return page.getByRole("button", { name: en.budgets.form.submit });
}

async function addBudget(page: Page, category: string, amount: string) {
  await page.goto("/budgets/new");
  await page
    .getByRole("combobox", { name: en.budgets.form.category, exact: true })
    .selectOption({ label: category });
  await amountBox(page).fill(amount);
  await saveButton(page).click();
  await expect(toast(page, en.budgets.notices.saved)).toBeVisible();
}

test("a new budget shows the limit and all of it left", async ({ page }) => {
  await signUpAndConfirm(page);
  await addBudget(page, "Food", "2,000,000");

  await expect(page).toHaveURL(/\/budgets$/);
  const food = line(page, "Food");
  await expect(
    food.getByText("₭0 of ₭2,000,000", { exact: true }),
  ).toBeVisible();
  await expect(
    food.getByText("₭2,000,000 left", { exact: true }),
  ).toBeVisible();
  await expect(food.getByRole("progressbar", { name: "Food" })).toBeVisible();
});

test("spending counts against its own category only", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "5,000,000" });
  await addBudget(page, "Food", "2,000,000");
  await addEntry(page, { amount: "45,000", category: "Food" });
  await addEntry(page, { amount: "300,000", category: "Bills" });

  await page.goto("/budgets");
  const food = line(page, "Food");
  await expect(
    food.getByText("₭45,000 of ₭2,000,000", { exact: true }),
  ).toBeVisible();
  await expect(
    food.getByText("₭1,955,000 left", { exact: true }),
  ).toBeVisible();
});

test("going over the budget says how much", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "5,000,000" });
  await addBudget(page, "Food", "10,000");
  await addEntry(page, { amount: "45,000", category: "Food" });

  await page.goto("/budgets");
  const food = line(page, "Food");
  await expect(food.getByText("₭35,000 over", { exact: true })).toBeVisible();
  await expect(
    food.getByText("₭45,000 of ₭10,000", { exact: true }),
  ).toBeVisible();
});

test("a budget can be edited and then ended", async ({ page }) => {
  await signUpAndConfirm(page);
  await addBudget(page, "Food", "2,000,000");

  await line(page, "Food").getByRole("link", { name: en.budgets.edit }).click();
  await expect(amountBox(page)).toHaveValue("2,000,000");
  await amountBox(page).fill("3,000,000");
  await saveButton(page).click();
  await expect(toast(page, en.budgets.notices.saved)).toBeVisible();
  await expect(
    line(page, "Food").getByText("₭0 of ₭3,000,000", { exact: true }),
  ).toBeVisible();

  await line(page, "Food").getByRole("link", { name: en.budgets.edit }).click();
  await page.getByRole("button", { name: en.budgets.end }).click();
  await page.getByRole("button", { name: en.budgets.endYes }).click();
  await expect(toast(page, en.budgets.notices.ended)).toBeVisible();
  await expect(shown(page.getByText(en.budgets.empty))).toBeVisible();
  await expect(line(page, "Food")).toHaveCount(0);
});

test("the previous month is read-only", async ({ page }) => {
  await signUpAndConfirm(page);
  await addBudget(page, "Food", "2,000,000");
  await expect(
    shown(page.getByRole("link", { name: en.budgets.add })),
  ).toBeVisible();

  await page
    .getByRole("link", { name: en.transactions.filters.previousMonth })
    .click();
  await expect(page).toHaveURL(/\/budgets\?month=\d{4}-\d{2}$/);
  const { emptyPast } = en.budgets;
  const start = emptyPast.slice(0, emptyPast.indexOf("{month}"));
  await expect(shown(page.getByText(start))).toBeVisible();
  await expect(
    shown(page.getByRole("link", { name: en.budgets.add })),
  ).toHaveCount(0);
  await expect(
    shown(page.getByRole("link", { name: en.budgets.edit })),
  ).toHaveCount(0);
});

test("the budget pages fit every width", async ({ page }) => {
  await signUpAndConfirm(page);
  await addBudget(page, "Food", "2,000,000");

  const report: string[] = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });

    await page.goto("/budgets");
    const bar = shown(page.getByRole("progressbar", { name: "Food" }));
    await expect(bar).toBeVisible();
    const box = await bar.boundingBox();
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(overflow.scroll, `/budgets at ${width}px`).toBeLessThanOrEqual(
      overflow.inner,
    );
    report.push(
      `/budgets ${width}px: page ${overflow.scroll}, bar ${Math.round(box?.x ?? 0)} to ${Math.round((box?.x ?? 0) + (box?.width ?? 0))}`,
    );

    await page.goto("/budgets/new");
    await expect(shown(amountBox(page))).toBeVisible();
    const form = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(form.scroll, `/budgets/new at ${width}px`).toBeLessThanOrEqual(
      form.inner,
    );
    report.push(`/budgets/new ${width}px: page ${form.scroll}`);
  }
  console.log(report.join("\n"));
});

// The Budgets section of Home
function homeBudgets(page: Page) {
  return shown(page.getByRole("region", { name: en.budgets.title }));
}

test("Home shows the most used budgets and links to all of them", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "5,000,000" });
  await addBudget(page, "Food", "2,000,000");
  await addEntry(page, { amount: "45,000", category: "Food" });

  await page.goto("/");
  const section = homeBudgets(page);
  await expect(section).toBeVisible();
  await expect(
    section.getByText("₭45,000 of ₭2,000,000", { exact: true }),
  ).toBeVisible();
  await expect(
    section.getByText("₭1,955,000 left", { exact: true }),
  ).toBeVisible();

  await section.getByRole("link", { name: en.budgets.seeAll }).click();
  await expect(page).toHaveURL(/\/budgets$/);
});

test("Home says how much a budget is over", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "5,000,000" });
  await addBudget(page, "Food", "10,000");
  await addEntry(page, { amount: "45,000", category: "Food" });

  await page.goto("/");
  await expect(
    homeBudgets(page).getByText("₭35,000 over", { exact: true }),
  ).toBeVisible();
});

test("Home without budgets has a plain link; with one it fits every width", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "5,000,000" });

  await page.goto("/");
  await expect(
    shown(page.getByRole("link", { name: en.budgets.title, exact: true })),
  ).toBeVisible();
  await expect(
    shown(page.getByRole("heading", { name: en.budgets.title })),
  ).toHaveCount(0);

  await addBudget(page, "Food", "2,000,000");

  const report: string[] = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const bar = homeBudgets(page).getByRole("progressbar", { name: "Food" });
    await expect(bar).toBeVisible();
    const box = await bar.boundingBox();
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(overflow.scroll, `Home at ${width}px`).toBeLessThanOrEqual(
      overflow.inner,
    );
    report.push(
      `Home ${width}px: page ${overflow.scroll}, bar ${Math.round(box?.x ?? 0)} to ${Math.round((box?.x ?? 0) + (box?.width ?? 0))}`,
    );
  }
  console.log(report.join("\n"));
});
