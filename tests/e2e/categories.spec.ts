import {
  expect as baseExpect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";
import { en } from "../../src/messages/en";
import {
  addAccount,
  addEntry,
  chip,
  openAddForm,
  signUpAndConfirm,
} from "./helpers";

test.describe.configure({ timeout: 90_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

const LIST_URL = "/settings/categories";

// Next.js keeps a hidden copy of the previous page, so text lookups must only count what is on screen
function shown(locator: Locator) {
  return locator.filter({ visible: true });
}

function notice(page: Page, message: string) {
  return page.locator("[data-sonner-toast]").filter({ hasText: message });
}

async function addCategory(
  page: Page,
  name: string,
  kind: "expense" | "income" = "expense",
) {
  await page.goto(LIST_URL);
  const nameBox = page.getByRole("textbox", {
    name: en.categories.form.name,
    exact: true,
  });
  await nameBox.fill(name);
  await page
    .getByRole("combobox", { name: en.categories.form.kind, exact: true })
    .selectOption(kind);
  await page
    .getByRole("button", { name: en.categories.form.submitNew })
    .click();
}

function row(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}

async function renameFromList(page: Page, from: string, to: string) {
  await page.goto(LIST_URL);
  await row(page, from)
    .getByRole("link", { name: en.categories.rename })
    .click();
  const nameBox = page.getByRole("textbox", {
    name: en.categories.form.name,
    exact: true,
  });
  await expect(nameBox).toHaveValue(from);
  await nameBox.fill(to);
  await page
    .getByRole("button", { name: en.categories.form.submitEdit })
    .click();
  await expect(page).toHaveURL(LIST_URL);
}

test("a new category shows up as a chip on the Add form", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash" });

  await addCategory(page, "Coffee");
  await expect(notice(page, en.categories.notices.added)).toBeVisible();
  await expect(row(page, "Coffee")).toHaveCount(1);

  await openAddForm(page);
  await expect(chip(page, "Coffee")).toBeVisible();
  // Coffee is an expense, so it isn't offered for income
  await page
    .getByRole("button", { name: en.transactions.kinds.income })
    .click();
  await expect(chip(page, "Coffee")).toHaveCount(0);
});

test("renaming a category renames it in History", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100,000" });
  await addCategory(page, "Coffee");
  await expect(notice(page, en.categories.notices.added)).toBeVisible();
  await addEntry(page, { amount: "20,000", category: "Coffee" });

  await renameFromList(page, "Coffee", "Café");
  await expect(row(page, "Café")).toHaveCount(1);
  await expect(row(page, "Coffee")).toHaveCount(0);

  await page.goto("/transactions");
  await expect(
    page.getByRole("link", { name: /Café.*-₭20,000/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Coffee/ })).toHaveCount(0);
});

test("a hidden category leaves the Add form, keeps old entries, and comes back", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100,000" });
  await addCategory(page, "Café");
  await expect(notice(page, en.categories.notices.added)).toBeVisible();
  await addEntry(page, { amount: "20,000", category: "Café" });

  await page.goto(LIST_URL);
  await row(page, "Café")
    .getByRole("link", { name: en.categories.rename })
    .click();
  await page
    .getByRole("button", { name: en.categories.detail.hide, exact: true })
    .click();
  await expect(
    shown(page.getByText(en.categories.detail.hideConfirm)),
  ).toBeVisible();
  // Cancelling the confirmation changes nothing
  await page.getByRole("button", { name: en.categories.form.cancel }).click();
  await expect(
    page.getByRole("button", { name: en.categories.detail.hide, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: en.categories.detail.hide, exact: true })
    .click();
  await page
    .getByRole("button", { name: en.categories.detail.hideYes })
    .click();
  await expect(page).toHaveURL(LIST_URL);
  await expect(notice(page, en.categories.notices.hidden)).toBeVisible();

  // It moves to the Hidden section, which stays folded away until the link is tapped
  const hidden = page.getByRole("region", {
    name: en.categories.hiddenTitle,
    exact: true,
  });
  const showHidden = page.getByRole("link", {
    name: en.categories.showHidden.replace("{count}", "1"),
  });
  await expect(hidden).toHaveCount(0);
  await showHidden.click();
  await expect(page).toHaveURL(`${LIST_URL}?hidden=1`);
  await expect(hidden.getByText("Café")).toBeVisible();
  await page.getByRole("link", { name: en.categories.hideHidden }).click();
  await expect(page).toHaveURL(LIST_URL);
  await expect(hidden).toHaveCount(0);

  await openAddForm(page);
  await expect(chip(page, "Food")).toBeVisible();
  await expect(chip(page, "Café")).toHaveCount(0);

  // The old entry keeps its category, and its Edit form still has it selected
  await page.goto("/transactions");
  // The History filter still lists it, marked as hidden
  await expect(
    page
      .getByRole("combobox", { name: en.transactions.filters.category })
      .getByRole("option", { name: `Café ${en.categories.hiddenSuffix}` }),
  ).toHaveCount(1);
  await page.getByRole("link", { name: /Café.*-₭20,000/ }).click();
  await expect(chip(page, "Café")).toBeChecked();

  await page.goto(LIST_URL);
  await showHidden.click();
  await hidden.getByRole("button", { name: en.categories.showAgain }).click();
  await expect(notice(page, en.categories.notices.shown)).toBeVisible();
  // Nothing is hidden any more, so both the list and its link are gone
  await expect(hidden).toHaveCount(0);
  await expect(showHidden).toHaveCount(0);

  await openAddForm(page);
  await expect(chip(page, "Café")).toBeVisible();
});

test("the category pages fit every width", async ({ page }) => {
  await signUpAndConfirm(page);
  await page.goto("/settings/categories");
  const firstRename = page.getByRole("link", { name: /rename/i }).first();
  const editPath = await firstRename.getAttribute("href");
  for (const path of [
    "/settings/categories",
    editPath ?? "/settings/categories",
  ]) {
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});

test("a duplicate name is refused, whatever the capitals", async ({ page }) => {
  await signUpAndConfirm(page);
  await addCategory(page, "Coffee");
  await expect(notice(page, en.categories.notices.added)).toBeVisible();

  await addCategory(page, "cOFFEE");
  await expect(page.getByText(en.categories.errors.name_taken)).toBeVisible();
  await expect(page).toHaveURL(LIST_URL);
  await expect(row(page, "Coffee")).toHaveCount(1);
});

test("adding two categories in a row shows the toast both times", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await page.goto(LIST_URL);
  for (const name of ["Coffee", "Books"]) {
    await page
      .getByRole("textbox", { name: en.categories.form.name, exact: true })
      .fill(name);
    await page
      .getByRole("button", { name: en.categories.form.submitNew })
      .click();
    const toast = notice(page, en.categories.notices.added);
    await expect(toast).toBeVisible();
    await expect(row(page, name)).toHaveCount(1);
    await expect(toast).toHaveCount(0, { timeout: 6000 });
  }
});
