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
  await row(page, from).getByRole("link", { name: en.categories.edit }).click();
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

test("a category keeps the icon and colour it was given", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash" });

  await page.goto(LIST_URL);
  await page
    .getByRole("textbox", { name: en.categories.form.name, exact: true })
    .fill("Coffee beans");
  await page
    .getByRole("radio", { name: en.categories.icons.coffee, exact: true })
    .check();
  await page
    .getByRole("radio", { name: en.categories.colors.amber, exact: true })
    .check();
  await page
    .getByRole("button", { name: en.categories.form.submitNew })
    .click();
  await expect(notice(page, en.categories.notices.added)).toBeVisible();
  await expect(
    row(page, "Coffee beans").locator("svg.lucide-coffee"),
  ).toBeVisible();

  await row(page, "Coffee beans")
    .getByRole("link", { name: en.categories.edit })
    .click();
  await expect(
    page.getByRole("radio", { name: en.categories.icons.coffee, exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: en.categories.colors.amber, exact: true }),
  ).toBeChecked();

  await openAddForm(page);
  await expect(
    chip(page, "Coffee beans").locator("xpath=..").locator("svg.lucide-coffee"),
  ).toBeVisible();
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
    .getByRole("link", { name: en.categories.edit })
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
  // The History filter still lists it, marked as hidden; the open panel covers the rows, so close it again
  const filtersToggle = page.locator("summary", {
    hasText: en.transactions.filters.filters,
  });
  await filtersToggle.click();
  await expect(
    page
      .getByRole("combobox", { name: en.transactions.filters.category })
      .getByRole("option", { name: `Café ${en.categories.hiddenSuffix}` }),
  ).toHaveCount(1);
  await filtersToggle.click();
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
  const firstRename = page
    .getByRole("link", { name: en.categories.edit, exact: true })
    .first();
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

function expenseList(page: Page) {
  return page.getByRole("region", {
    name: en.categories.expenseTitle,
    exact: true,
  });
}

function handle(page: Page, name: string) {
  return page.getByRole("button", {
    name: en.categories.order.move.replace("{name}", () => name),
    exact: true,
  });
}

// The names of the Expense list, top to bottom, read from the handles
function expenseNames(page: Page): Promise<string[]> {
  const prefix = en.categories.order.move.replace("{name}", () => "");
  return expenseList(page)
    .getByRole("button")
    .evaluateAll(
      (buttons, remove) =>
        buttons.map((button) =>
          (button.getAttribute("aria-label") ?? "").replace(remove, ""),
        ),
      prefix,
    );
}

// The screen-reader message for one place of the Expense list (it starts with 10 categories)
function said(page: Page, template: string, name: string, place: number) {
  const text = template
    .replace("{name}", () => name)
    .replace("{position}", () => String(place))
    .replace("{count}", () => "10");
  return page.getByRole("status").filter({ hasText: text });
}

// The page that sends the new order is the one that answers with a Server Action reply
function orderSaved(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.request().headers()["next-action"] !== undefined,
  );
}

test("dragging a category by its handle changes the order on the Add form", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash" });
  await page.setViewportSize({ width: 1280, height: 1600 });
  await page.goto(LIST_URL);

  const from = await handle(page, "Bills").boundingBox();
  const to = await handle(page, "Food").boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  await page.mouse.move(
    (from?.x ?? 0) + (from?.width ?? 0) / 2,
    (from?.y ?? 0) + (from?.height ?? 0) / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    (to?.x ?? 0) + (to?.width ?? 0) / 2,
    (to?.y ?? 0) + (to?.height ?? 0) / 2,
    { steps: 10 },
  );
  const saved = orderSaved(page);
  await page.mouse.up();
  await saved;

  await expect
    .poll(async () => (await expenseNames(page)).slice(0, 2))
    .toEqual(["Bills", "Food"]);
  await page.reload();
  await expect
    .poll(async () => (await expenseNames(page)).slice(0, 2))
    .toEqual(["Bills", "Food"]);

  await openAddForm(page);
  await expect(page.getByRole("radio").first()).toHaveAccessibleName("Bills");
});

test("the keyboard moves a category too", async ({ page }) => {
  await signUpAndConfirm(page);
  await page.goto(LIST_URL);

  const food = handle(page, "Food");
  await food.focus();
  await page.keyboard.press("Space");
  // Each message shows the library took the key, so the next key is not sent too early
  await expect(
    said(page, en.categories.order.movedTo, "Food", 1),
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(
    said(page, en.categories.order.movedTo, "Food", 2),
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(
    said(page, en.categories.order.movedTo, "Food", 3),
  ).toBeVisible();
  const saved = orderSaved(page);
  await page.keyboard.press("Space");
  await saved;

  await expect
    .poll(async () => (await expenseNames(page)).indexOf("Food"))
    .toBe(2);
  await page.reload();
  await expect
    .poll(async () => (await expenseNames(page)).indexOf("Food"))
    .toBe(2);
});

test("a new category goes to the end of its list", async ({ page }) => {
  await signUpAndConfirm(page);
  await addCategory(page, "Coffee");
  await expect(notice(page, en.categories.notices.added)).toBeVisible();

  await expect
    .poll(async () => (await expenseNames(page)).at(-1))
    .toBe("Coffee");
});
