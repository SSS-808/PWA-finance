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
  moreTile,
  openSettings,
  signUpAndConfirm,
} from "./helpers";

test.describe.configure({ timeout: 180_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

const widths = [320, 390, 768, 1024, 1280, 1440];

// Next.js keeps a hidden copy of the previous page, so lookups must only count what is on screen
function shown(locator: Locator) {
  return locator.filter({ visible: true });
}

function navLink(page: Page, name: string) {
  return page
    .getByRole("navigation", { name: en.nav.label })
    .getByRole("link", { name });
}

// The back link in the page, not the nav item of the same name
function backLink(page: Page) {
  return shown(
    page.getByRole("main").getByRole("link", { name: en.more.back }),
  );
}

// New users get the Asia/Vientiane time zone, so "today" is counted there; the offset is in days
function day(offset: number): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Vientiane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

async function addTrip(
  page: Page,
  trip: { name: string; from: string; to: string },
) {
  await page.goto("/trips/new");
  await page.getByLabel(en.trips.form.name, { exact: true }).fill(trip.name);
  await page
    .getByLabel(en.trips.form.startsOn, { exact: true })
    .fill(trip.from);
  await page.getByLabel(en.trips.form.endsOn, { exact: true }).fill(trip.to);
  await page.getByRole("button", { name: en.trips.form.submit }).click();
  await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}/);
}

test("More shows the four tiles, the Insights and Settings rows, and each opens its page", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await navLink(page, en.nav.more).click();
  await expect(page).toHaveURL(/\/more$/);
  await expect(
    shown(page.getByRole("heading", { name: en.more.title, level: 1 })),
  ).toBeVisible();

  await expect(moreTile(page, "/budgets")).toContainText(en.budgets.title);
  await expect(moreTile(page, "/goals")).toContainText(en.goals.title);
  await expect(moreTile(page, "/trips")).toContainText(en.more.tripsNone);
  await expect(moreTile(page, "/settings/categories")).toContainText(
    en.more.categories,
  );
  await expect(moreTile(page, "/settings")).toContainText(en.more.settingsHint);
  await expect(moreTile(page, "/insights")).toContainText(en.more.insightsNone);

  const targets = [
    { href: "/budgets", url: /\/budgets$/ },
    { href: "/goals", url: /\/goals$/ },
    { href: "/trips", url: /\/trips$/ },
    { href: "/insights", url: /\/insights$/ },
    { href: "/settings/categories", url: /\/settings\/categories$/ },
    { href: "/settings", url: /\/settings$/ },
  ];
  for (const { href, url } of targets) {
    await page.goto("/more");
    await moreTile(page, href).click();
    await expect(page).toHaveURL(url);
  }
});

test("More is the current page on More, Budgets, Goals, Trips, Insights and Settings, and Home is not", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await expect(navLink(page, en.nav.home)).toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const path of [
    "/more",
    "/budgets",
    "/goals",
    "/trips",
    "/insights",
    "/settings",
  ]) {
    await page.goto(path);
    await expect(navLink(page, en.nav.more), path).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(navLink(page, en.nav.home), path).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});

test("Budgets, Goals, Trips and Settings have a More back link", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  for (const path of ["/budgets", "/goals", "/trips"]) {
    await page.goto(path);
    await backLink(page).click();
    await expect(page).toHaveURL(/\/more$/);
  }
  await openSettings(page);
  await backLink(page).click();
  await expect(page).toHaveURL(/\/more$/);
});

test("Home has no Money In or Money Out buttons, and Add still takes the type from the address", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await page.goto("/");
  await expect(shown(page.getByRole("link", { name: "Money In" }))).toHaveCount(
    0,
  );
  await expect(
    shown(page.getByRole("link", { name: "Money Out" })),
  ).toHaveCount(0);
  await expect(
    shown(page.getByRole("heading", { name: en.budgets.title })),
  ).toHaveCount(0);
  await expect(
    shown(page.getByRole("heading", { name: en.goals.title })),
  ).toHaveCount(0);

  await page.goto("/transactions/new?kind=income&from=%2F");
  await expect(
    page.getByRole("button", {
      name: en.transactions.kinds.income,
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("Home shows the trip line only while a trip is on", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "5,000,000" });

  const tripLink = shown(page.locator('main a[href^="/trips/"]'));
  await page.goto("/");
  await expect(
    shown(page.getByRole("link", { name: en.home.startTitle })),
  ).toHaveCount(0);
  await expect(tripLink).toHaveCount(0);

  await addTrip(page, { name: "Hanoi", from: day(30), to: day(35) });
  await page.goto("/");
  await expect(
    shown(page.getByRole("heading", { name: en.dashboard.recent })),
  ).toBeVisible();
  await expect(tripLink).toHaveCount(0);
  await page.goto("/more");
  await expect(moreTile(page, "/trips")).toContainText("Next: Hanoi");

  await addTrip(page, { name: "Pakse", from: day(-1), to: day(2) });
  await page.goto("/");
  await expect(tripLink).toContainText("Pakse · day 2 of 4");
  await expect(tripLink).toContainText(en.trips.nothingSpent);

  await addEntry(page, { amount: "45,000", category: "Food" });
  await page.goto("/");
  await expect(tripLink).toContainText("Spent so far ₭45,000.00");
  await page.goto("/more");
  await expect(moreTile(page, "/trips")).toContainText("Pakse is on now");

  await page.goto("/");
  await tripLink.click();
  await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/);
});

test("the More page fits every width", async ({ page }) => {
  await signUpAndConfirm(page);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/more");
    await expect(moreTile(page, "/trips")).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `/more at ${width}px`).toBeLessThanOrEqual(0);
  }
});
