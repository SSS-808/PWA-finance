import AxeBuilder from "@axe-core/playwright";
import {
  expect as baseExpect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";
import { en } from "../../src/messages/en";
import {
  accountRows,
  addAccount,
  fillEntry,
  openAddForm,
  signUpAndConfirm,
  waitForSaved,
} from "./helpers";

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

// The card of one goal on the Goals page
function card(page: Page, name: string) {
  return shown(page.getByRole("listitem")).filter({ hasText: name });
}

function nameBox(page: Page) {
  return page.getByRole("textbox", { name: en.goals.form.name, exact: true });
}

function targetBox(page: Page) {
  return page.getByRole("textbox", { name: en.goals.form.target, exact: true });
}

function amountBox(page: Page) {
  return page.getByRole("textbox", {
    name: en.goals.money.amount,
    exact: true,
  });
}

// New users get the Asia/Vientiane time zone, so "today" is counted there
function monthEnd(monthsAhead: number): { date: string; label: string } {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Vientiane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;
  const last = new Date(Date.UTC(year, month + monthsAhead + 1, 0));
  return {
    date: last.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(last),
  };
}

async function addGoal(
  page: Page,
  goal: { name: string; target: string; deadline?: string },
) {
  await page.goto("/goals/new");
  await nameBox(page).fill(goal.name);
  await targetBox(page).fill(goal.target);
  if (goal.deadline) {
    await page.getByLabel(en.goals.form.deadline).fill(goal.deadline);
  }
  await page.getByRole("button", { name: en.goals.form.submit }).click();
  await expect(toast(page, en.goals.notices.added)).toBeVisible();
  await expect(page).toHaveURL(/\/goals$/);
}

async function openGoal(page: Page, name: string) {
  await card(page, name).getByRole("link", { name }).click();
  await expect(
    shown(page.getByRole("heading", { level: 1, name })),
  ).toBeVisible();
}

async function moveMoney(
  page: Page,
  direction: "add" | "take",
  amount: string,
  notice?: string,
) {
  await amountBox(page).fill(amount);
  await page
    .getByRole("button", {
      name: direction === "add" ? en.goals.money.add : en.goals.money.take,
    })
    .click();
  if (notice) await expect(toast(page, notice)).toBeVisible();
}

test("a new goal shows the target and all of it still to go", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addGoal(page, { name: "Laptop", target: "10,000,000" });

  const laptop = card(page, "Laptop");
  await expect(
    laptop.getByText("₭0 of ₭10,000,000", { exact: true }),
  ).toBeVisible();
  await expect(
    laptop.getByText("₭10,000,000 to go", { exact: true }),
  ).toBeVisible();
  await expect(
    laptop.getByRole("progressbar", { name: "Laptop" }),
  ).toBeVisible();
});

test("money can be added to a goal and taken out again", async ({ page }) => {
  await signUpAndConfirm(page);
  await addGoal(page, { name: "Laptop", target: "10,000,000" });
  await openGoal(page, "Laptop");

  await moveMoney(page, "add", "7,000,000", en.goals.notices.money_added);
  await expect(
    shown(page.getByText("₭7,000,000 of ₭10,000,000", { exact: true })),
  ).toBeVisible();
  await expect(
    shown(page.getByRole("listitem")).filter({ hasText: "+₭7,000,000" }),
  ).toBeVisible();
  await expect(amountBox(page)).toHaveValue("");

  await moveMoney(page, "take", "2,000,000", en.goals.notices.money_taken);
  await expect(
    shown(page.getByText("₭5,000,000 of ₭10,000,000", { exact: true })),
  ).toBeVisible();
  await expect(
    shown(page.getByRole("listitem")).filter({ hasText: "-₭2,000,000" }),
  ).toBeVisible();
});

test("taking out more than is saved is refused and changes nothing", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addGoal(page, { name: "Laptop", target: "10,000,000" });
  await openGoal(page, "Laptop");
  await moveMoney(page, "add", "1,000,000", en.goals.notices.money_added);

  await moveMoney(page, "take", "2,000,000");
  await expect(
    shown(page.getByText(en.goals.errors.not_enough_saved)),
  ).toBeVisible();
  await expect(
    shown(page.getByText("₭1,000,000 of ₭10,000,000", { exact: true })),
  ).toBeVisible();
  await expect(
    shown(page.getByRole("listitem")).filter({ hasText: "-₭2,000,000" }),
  ).toHaveCount(0);
});

test("a goal with a deadline says what to save each month until it is reached", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  const deadline = monthEnd(2);
  await addGoal(page, {
    name: "Trip",
    target: "9,000,000",
    deadline: deadline.date,
  });

  await expect(
    card(page, "Trip").getByText(
      `₭3,000,000 a month to make it by ${deadline.label}`,
      { exact: true },
    ),
  ).toBeVisible();

  await openGoal(page, "Trip");
  await moveMoney(page, "add", "9,000,000", en.goals.notices.money_added);
  await expect(
    shown(page.getByText(en.goals.reached, { exact: true })),
  ).toBeVisible();
});

test("a goal can be archived and brought back", async ({ page }) => {
  await signUpAndConfirm(page);
  await addGoal(page, { name: "Laptop", target: "10,000,000" });
  await openGoal(page, "Laptop");

  await page
    .getByRole("button", { name: en.goals.archive, exact: true })
    .click();
  await page.getByRole("button", { name: en.goals.archiveYes }).click();
  await expect(toast(page, en.goals.notices.archived)).toBeVisible();
  await expect(card(page, "Laptop")).toHaveCount(0);

  const showArchived = en.goals.showArchived.replace("{count}", "1");
  await shown(page.getByRole("link", { name: showArchived })).click();
  await expect(page).toHaveURL(/\/goals\?archived=1$/);
  await expect(card(page, "Laptop")).toBeVisible();

  await openGoal(page, "Laptop");
  await expect(
    shown(page.getByRole("button", { name: en.goals.money.add })),
  ).toHaveCount(0);
  await page.getByRole("button", { name: en.goals.unarchive }).click();
  await expect(toast(page, en.goals.notices.saved)).toBeVisible();

  await page.goto("/goals");
  await expect(card(page, "Laptop")).toBeVisible();
  await expect(
    shown(page.getByRole("link", { name: showArchived })),
  ).toHaveCount(0);
});

test("the goal pages fit every width", async ({ page }) => {
  await signUpAndConfirm(page);
  await addGoal(page, {
    name: "Laptop",
    target: "10,000,000",
    deadline: monthEnd(5).date,
  });
  await openGoal(page, "Laptop");
  await moveMoney(page, "add", "3,000,000", en.goals.notices.money_added);
  const goalUrl = page.url().split("?")[0] ?? "/goals";

  const report: string[] = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ["/goals", goalUrl]) {
      await page.goto(path);
      const bar = shown(page.getByRole("progressbar", { name: "Laptop" }));
      await expect(bar).toBeVisible();
      const box = await bar.boundingBox();
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        inner: window.innerWidth,
      }));
      const label = path === "/goals" ? "/goals" : "/goals/[id]";
      expect(overflow.scroll, `${label} at ${width}px`).toBeLessThanOrEqual(
        overflow.inner,
      );
      report.push(
        `${label} ${width}px: page ${overflow.scroll}, bar ${Math.round(box?.x ?? 0)} to ${Math.round((box?.x ?? 0) + (box?.width ?? 0))}`,
      );
    }
  }
  console.log(report.join("\n"));
});

// The Goals section on Home; Home shows it once there is an account
function homeGoals(page: Page) {
  return shown(page.getByRole("region", { name: en.goals.title }));
}

test("Home shows a goal with its progress and links to all goals", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash" });
  await addGoal(page, { name: "Laptop", target: "10,000,000" });
  await openGoal(page, "Laptop");
  await moveMoney(page, "add", "7,000,000", en.goals.notices.money_added);

  await page.goto("/");
  const section = homeGoals(page);
  await expect(section).toBeVisible();
  await expect(
    section.getByText("₭7,000,000 of ₭10,000,000", { exact: true }),
  ).toBeVisible();
  await section.getByRole("link", { name: en.goals.seeAll }).click();
  await expect(page).toHaveURL(/\/goals$/);
});

test("Home lists three goals while the Goals page lists all four", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash" });
  for (const name of ["Alpha", "Bravo", "Charlie", "Delta"]) {
    await addGoal(page, { name, target: "1,000,000" });
  }

  await page.goto("/");
  await expect(homeGoals(page)).toBeVisible();
  await expect(homeGoals(page).getByRole("listitem")).toHaveCount(3);

  await page.goto("/goals");
  for (const name of ["Alpha", "Bravo", "Charlie", "Delta"]) {
    await expect(card(page, name)).toBeVisible();
  }
});

test("Home without goals has only the Goals link, and with one goal it fits every width", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash" });

  await page.goto("/");
  await expect(
    shown(page.getByRole("link", { name: en.goals.title, exact: true })),
  ).toBeVisible();
  await expect(
    shown(page.getByRole("heading", { name: en.goals.title, exact: true })),
  ).toHaveCount(0);

  await addGoal(page, {
    name: "Laptop",
    target: "10,000,000",
    deadline: monthEnd(5).date,
  });
  await openGoal(page, "Laptop");
  await moveMoney(page, "add", "3,000,000", en.goals.notices.money_added);

  const report: string[] = [];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const bar = homeGoals(page).getByRole("progressbar", { name: "Laptop" });
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

function fromBox(page: Page) {
  return page.getByRole("combobox", { name: en.goals.money.from, exact: true });
}

// Opens the account's own page from the Accounts list
async function openAccountPage(page: Page, name: string) {
  await page.goto("/accounts");
  await accountRows(page, name).click();
  await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
}

const BCEL = {
  name: "BCEL",
  type: "bank",
  amount: "7,000,000",
  minimum: "50,000",
};

test("money added to a goal stays in the account, lowers its free to spend, and shows on the account page", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, BCEL);
  await addGoal(page, { name: "Laptop", target: "10,000,000" });
  await openGoal(page, "Laptop");

  await expect(fromBox(page)).toHaveValue(/[0-9a-f-]{36}/);
  await expect(fromBox(page)).toContainText("BCEL (free ₭6,950,000)");
  await expect(
    fromBox(page).locator("option", { hasText: en.goals.money.noAccount }),
  ).toHaveCount(0);
  await moveMoney(page, "add", "2,000,000", en.goals.notices.money_added);
  await expect(
    shown(
      page.getByText(en.goals.where.replace("{account}", "BCEL"), {
        exact: true,
      }),
    ),
  ).toBeVisible();
  await expect(
    shown(page.getByText("₭2,000,000", { exact: true })),
  ).toHaveCount(1);
  await expect(
    shown(page.getByText(en.goals.historyFrom.replace("{account}", "BCEL"))),
  ).toBeVisible();

  // The balance still matches the bank; only what is free to spend went down
  await page.goto("/accounts");
  await expect(accountRows(page, "BCEL")).toContainText("₭7,000,000");
  await expect(accountRows(page, "BCEL")).toContainText(
    en.accounts.freeLine.replace("{amount}", "₭4,950,000"),
  );

  await openAccountPage(page, "BCEL");
  await expect(
    shown(page.getByText(en.accounts.detail.setAside)),
  ).toBeVisible();
  await expect(shown(page.getByText("Laptop", { exact: true }))).toBeVisible();
  await expect(
    shown(page.getByText("₭2,000,000", { exact: true })),
  ).toBeVisible();
  await expect(
    shown(page.getByText("₭4,950,000", { exact: true })),
  ).toBeVisible();
});

test("taking money out of a goal gives it back to the account", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, BCEL);
  await addGoal(page, { name: "Laptop", target: "10,000,000" });
  await openGoal(page, "Laptop");
  await moveMoney(page, "add", "2,000,000", en.goals.notices.money_added);

  await moveMoney(page, "take", "500,000", en.goals.notices.money_taken);
  await expect(
    shown(page.getByText("₭1,500,000 of ₭10,000,000", { exact: true })),
  ).toBeVisible();
  await expect(
    shown(page.getByText(en.goals.historyFrom.replace("{account}", "BCEL"))),
  ).toHaveCount(2);
  const goalUrl = page.url().split("?")[0] ?? "/goals";

  await page.goto("/accounts");
  await expect(accountRows(page, "BCEL")).toContainText(
    en.accounts.freeLine.replace("{amount}", "₭5,450,000"),
  );

  // The account cannot give back more than the goal holds in it
  await page.goto(goalUrl);
  await moveMoney(page, "take", "1,600,000");
  await expect(
    shown(page.getByText(en.goals.errors.not_enough_in_account)),
  ).toBeVisible();
  await expect(
    shown(page.getByText("₭1,500,000 of ₭10,000,000", { exact: true })),
  ).toBeVisible();
});

test("an expense that eats into goal money offers to take it from the goal", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { ...BCEL, amount: "1,000,000" });
  await addGoal(page, { name: "Laptop", target: "10,000,000" });
  await openGoal(page, "Laptop");
  await moveMoney(page, "add", "600,000", en.goals.notices.money_added);

  // ₭350,000 is free to spend now, so ₭400,000 reaches into the Laptop money
  await openAddForm(page);
  await fillEntry(page, { amount: "400,000", category: "Food" });
  const dialog = page.getByRole("dialog", {
    name: en.transactions.overspend.title,
  });
  await expect(dialog).toContainText(
    en.transactions.overspend.bodyGoals
      .replace("{free}", "₭350,000")
      .replace("{minimum}", "₭50,000")
      .replace("{aside}", "₭600,000")
      .replace("{account}", "BCEL"),
  );
  await dialog
    .getByRole("button", {
      name: en.transactions.overspend.takeFromGoal.replace("{goal}", "Laptop"),
    })
    .click();
  await waitForSaved(page);

  // ₭600,000 is left in the account and ₭550,000 of it is above the minimum, so the goal gave up ₭50,000
  await page.goto("/accounts");
  await expect(accountRows(page, "BCEL")).toContainText("₭600,000");
  await expect(accountRows(page, "BCEL")).toContainText(
    en.accounts.freeLine.replace("{amount}", "₭0"),
  );
  await page.goto("/goals");
  await openGoal(page, "Laptop");
  await expect(
    shown(page.getByText("₭550,000 of ₭10,000,000", { exact: true })),
  ).toBeVisible();
  await expect(
    shown(page.getByRole("listitem")).filter({ hasText: "-₭50,000" }),
  ).toBeVisible();
  await expect(
    shown(page.getByText(en.goals.takeMissing.replace("{missing}", "₭50,000"))),
  ).toHaveCount(0);
});

test("Save anyway leaves the goal as it was, and its page warns until the missing money is taken out", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { ...BCEL, amount: "1,000,000" });
  await addGoal(page, { name: "Laptop", target: "10,000,000" });
  await openGoal(page, "Laptop");
  await moveMoney(page, "add", "900,000", en.goals.notices.money_added);
  const goalUrl = page.url().split("?")[0] ?? "/goals";

  await openAddForm(page);
  await fillEntry(page, { amount: "300,000", category: "Food" });
  const dialog = page.getByRole("dialog", {
    name: en.transactions.overspend.title,
  });
  await expect(
    dialog.getByRole("button", {
      name: en.transactions.overspend.takeFromGoal.replace("{goal}", "Laptop"),
    }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: en.transactions.overspend.saveAnyway })
    .click();
  await waitForSaved(page);

  // ₭700,000 is left, ₭650,000 above the minimum, but ₭900,000 is set aside
  await page.goto(goalUrl);
  const warning = en.goals.short
    .replace("{account}", "BCEL")
    .replace("{held}", "₭650,000")
    .replace("{aside}", "₭900,000");
  await expect(shown(page.getByText(warning))).toBeVisible();
  await expect(
    shown(page.getByText("₭900,000 of ₭10,000,000", { exact: true })),
  ).toBeVisible();

  // The warning page has no accessibility problems in either colour scheme
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    // A fresh load, so no colour is still fading from the other scheme
    await page.goto(goalUrl);
    await expect(shown(page.getByText(warning))).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      violations.map(
        ({ id, help, nodes }) =>
          `${id}: ${help} -> ${nodes.map((node) => node.target.join(" ")).join(" | ")}`,
      ),
      scheme,
    ).toEqual([]);
  }

  await shown(
    page.getByRole("button", {
      name: en.goals.takeMissing.replace("{missing}", "₭250,000"),
    }),
  ).click();
  await expect(toast(page, en.goals.notices.missing_taken)).toBeVisible();
  await expect(
    shown(page.getByText("₭650,000 of ₭10,000,000", { exact: true })),
  ).toBeVisible();
  await expect(shown(page.getByText(warning))).toHaveCount(0);

  await page.goto("/accounts");
  await expect(accountRows(page, "BCEL")).toContainText(
    en.accounts.freeLine.replace("{amount}", "₭0"),
  );
});
