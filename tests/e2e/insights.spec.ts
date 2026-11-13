import { expect as baseExpect, test, type Page } from "@playwright/test";
import { en } from "../../src/messages/en";
import {
  monthAfter,
  monthName,
  monthRangeLabel,
  monthYear,
} from "../../src/modules/analytics/domain/chart";
import { addAccount, addEntry, moreTile, signUpAndConfirm } from "./helpers";

test.describe.configure({ timeout: 180_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

// New users get the Asia/Vientiane time zone, so "today" is counted there
function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Vientiane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const thisMonth = today().slice(0, 7);

// The month a number of months back, and its 15th (never the first or last day)
function monthBack(count: number): string {
  return monthAfter(thisMonth, -count);
}

function fifteenth(count: number): string {
  return `${monthBack(count)}-15`;
}

function card(page: Page, title: string) {
  return page.getByRole("region", { name: title, exact: true });
}

// Budgets can only start in the current month, so "Budgets: how often kept" is covered by unit tests only
test("a new user sees the empty state, and More says what Insights holds", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await page.goto("/insights");
  await expect(
    page.getByRole("heading", { name: en.insights.title, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(en.insights.empty)).toBeVisible();
  await page.goto("/more");
  await expect(moreTile(page, "/insights")).toContainText(en.more.insightsNone);
});

test("two full months of kip entries give the numbers, the pie and the biggest expenses", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "5,000,000" });
  await addEntry(page, {
    amount: "1,000,000",
    category: "Salary",
    kind: "income",
    date: fifteenth(2),
  });
  await addEntry(page, {
    amount: "100,000",
    category: "Food",
    date: fifteenth(2),
  });
  await addEntry(page, {
    amount: "1,000,000",
    category: "Salary",
    kind: "income",
    date: fifteenth(1),
  });
  await addEntry(page, {
    amount: "300,000",
    category: "Food",
    date: fifteenth(1),
  });
  await addEntry(page, { amount: "50,000", category: "Food", date: today() });

  await page.goto("/insights");
  const normal = card(page, en.insights.cards.normal.title);
  await expect(normal).toContainText("₭1,000,000.00");
  await expect(normal).toContainText("₭200,000.00");
  await expect(normal).toContainText("₭800,000.00");
  await expect(normal).toContainText("80%");

  const monthly = card(page, en.insights.cards.monthly.title);
  await expect(
    monthly.getByRole("button", {
      name: `${monthYear(monthBack(2))}: in ₭1,000,000.00, out ₭100,000.00`,
    }),
  ).toBeVisible();
  await expect(
    monthly.getByRole("button", {
      name: `${monthYear(monthBack(1))}: in ₭1,000,000.00, out ₭300,000.00`,
    }),
  ).toBeVisible();
  await expect(
    monthly.getByRole("button", {
      name: `${monthYear(thisMonth)}: in ₭0.00, out ₭50,000.00 so far`,
    }),
  ).toBeVisible();

  const pie = card(page, en.insights.cards.pie.title);
  await expect(pie).toContainText(monthYear(monthBack(1)));
  await expect(pie).toContainText("Food");
  await expect(pie).toContainText("₭300,000.00");
  await pie
    .getByRole("button", { name: en.transactions.filters.previousMonth })
    .click();
  await expect(pie).toContainText(monthYear(monthBack(2)));
  await expect(pie).toContainText("₭100,000.00");

  const biggest = card(page, en.insights.cards.biggest.title);
  await expect(biggest.getByRole("listitem").first()).toContainText(
    "₭300,000.00",
  );

  await page.goto("/more");
  await expect(moreTile(page, "/insights")).toContainText(
    "A normal month: ₭200,000.00 out",
  );
});

test("with only one full month the waiting card says how many there are", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "5,000,000" });
  await addEntry(page, {
    amount: "300,000",
    category: "Food",
    date: fifteenth(1),
  });
  await addEntry(page, { amount: "50,000", category: "Food", date: today() });

  await page.goto("/insights");
  await expect(
    page.getByText(`You have 1 so far: ${monthYear(monthBack(1))}.`),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: en.insights.waitingTitle.replace(
        "{month}",
        monthName(monthAfter(thisMonth, 1)),
      ),
    }),
  ).toBeVisible();
});

test("a second currency adds chips, and choosing it shows only its numbers", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "5,000,000" });
  await addAccount(page, { name: "Dollars", currency: "USD", amount: "500" });
  await addEntry(page, {
    amount: "300,000",
    category: "Food",
    account: "Cash",
    date: fifteenth(1),
  });
  await addEntry(page, {
    amount: "12.50",
    category: "Food",
    account: "Dollars",
    date: fifteenth(1),
  });

  await page.goto("/insights");
  const chips = page.getByRole("group", { name: en.insights.currencyLabel });
  await expect(chips).toBeVisible();
  await expect(page.getByRole("main")).toContainText("₭300,000.00");
  await chips.getByRole("link", { name: en.currencies.USD }).click();
  await expect(page).toHaveURL(/currency=USD/);
  await expect(page.getByRole("main")).toContainText("$12.50");
  await expect(card(page, en.insights.cards.monthly.title)).not.toContainText(
    "₭",
  );
  await expect(card(page, en.insights.cards.biggest.title)).not.toContainText(
    "₭",
  );
});

test("the period menu changes the period in the address and the subtitle", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "5,000,000" });
  await addEntry(page, {
    amount: "100,000",
    category: "Food",
    date: fifteenth(5),
  });
  await addEntry(page, {
    amount: "300,000",
    category: "Food",
    date: fifteenth(1),
  });

  const subtitle = (months: number) =>
    en.insights.subtitle
      .replace("{from}", monthRangeLabel(monthBack(months), monthBack(1)))
      .replace("{current}", monthName(thisMonth));
  await page.goto("/insights");
  await expect(page.getByText(subtitle(5))).toBeVisible();
  await page
    .getByRole("button", {
      name: en.insights.periodCurrent.replace("{n}", "6"),
    })
    .click();
  await page.getByRole("link", { name: "3 months" }).click();
  await expect(page).toHaveURL(/period=3/);
  await expect(page.getByText(subtitle(3))).toBeVisible();
});

test("Insights fits a 320px screen without sideways scrolling", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "5,000,000" });
  await addEntry(page, {
    amount: "1,000,000",
    category: "Salary",
    kind: "income",
    date: fifteenth(2),
  });
  await addEntry(page, {
    amount: "100,000",
    category: "Food",
    date: fifteenth(2),
  });
  await addEntry(page, {
    amount: "300,000",
    category: "Food",
    date: fifteenth(1),
  });
  await page.setViewportSize({ width: 320, height: 800 });
  for (const url of ["/insights", "/insights?period=12"]) {
    await page.goto(url);
    await expect(card(page, en.insights.cards.monthly.title)).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `${url} at 320px`).toBeLessThanOrEqual(0);
  }
});
