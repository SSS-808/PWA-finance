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
  dateBox,
  fillEntry,
  openAddForm,
  saveButton,
  signUpAndConfirm,
  waitForSaved,
} from "./helpers";

test.describe.configure({ timeout: 180_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

const text = en.trips;

// Next.js keeps a hidden copy of the previous page, so lookups must only count what is on screen
function shown(locator: Locator) {
  return locator.filter({ visible: true });
}

function toast(page: Page, message: string) {
  return page.locator("[data-sonner-toast]").filter({ hasText: message });
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

function section(page: Page, name: string) {
  return shown(page.getByRole("region", { name, exact: true }));
}

async function fillTrip(
  page: Page,
  trip: { name: string; from: string; to: string },
) {
  await page.getByLabel(text.form.name, { exact: true }).fill(trip.name);
  await page.getByLabel(text.form.startsOn, { exact: true }).fill(trip.from);
  await page.getByLabel(text.form.endsOn, { exact: true }).fill(trip.to);
  await page.getByRole("button", { name: text.form.submit }).click();
}

async function addTrip(
  page: Page,
  trip: { name: string; from: string; to: string },
) {
  await page.goto("/trips/new");
  await fillTrip(page, trip);
  await expect(toast(page, text.notices.added)).toBeVisible();
  await expect(
    shown(page.getByRole("heading", { level: 1, name: trip.name })),
  ).toBeVisible();
}

test("a new trip lands under On now, Coming up or Past by its days", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await page.goto("/trips");
  await expect(shown(page.getByText(text.empty))).toBeVisible();

  await addTrip(page, { name: "Pakse", from: day(-1), to: day(2) });
  await addTrip(page, { name: "Hanoi", from: day(30), to: day(35) });
  await addTrip(page, { name: "Bangkok", from: day(-60), to: day(-55) });

  await page.goto("/trips");
  const now = section(page, text.sections.now);
  await expect(now.getByText("Pakse")).toBeVisible();
  await expect(now.getByText("day 2 of 4")).toBeVisible();
  await expect(now.getByText("Hanoi")).toHaveCount(0);
  await expect(
    section(page, text.sections.upcoming).getByText("Hanoi"),
  ).toBeVisible();
  await expect(
    section(page, text.sections.upcoming).getByText(text.nothingSpent),
  ).toBeVisible();
  await expect(
    section(page, text.sections.past).getByText("Bangkok"),
  ).toBeVisible();
});

test("a trip that shares a day with another is refused", async ({ page }) => {
  await signUpAndConfirm(page);
  await addTrip(page, { name: "Pakse", from: day(-10), to: day(-5) });

  await page.goto("/trips/new");
  await fillTrip(page, { name: "Savannakhet", from: day(-7), to: day(-3) });
  await expect(
    shown(page.getByRole("alert")).filter({
      hasText: text.errors.dates_overlap,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/trips\/new$/);

  await page.getByLabel(text.form.startsOn, { exact: true }).fill(day(-4));
  await page.getByRole("button", { name: text.form.submit }).click();
  await expect(toast(page, text.notices.added)).toBeVisible();
});

// Two accounts, and three entries: two inside the trip's days and one after them
async function setUpTripWithEntries(page: Page) {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addAccount(page, {
    name: "Dollars",
    currency: "USD",
    amount: "500",
  });
  await addEntry(page, {
    amount: "100,000",
    category: "Food",
    account: "Cash",
    date: day(-8),
    note: "Noodles in Hue",
  });
  await addEntry(page, {
    amount: "20",
    category: "Food",
    account: "Dollars",
    date: day(-6),
    note: "Coffee in Hanoi",
  });
  await addEntry(page, {
    amount: "30,000",
    category: "Food",
    account: "Cash",
    date: day(-2),
    note: "Lunch back home",
  });
  await addTrip(page, { name: "Vietnam", from: day(-10), to: day(-5) });
}

test("one tap adds the untagged entries and the trip page shows what was spent", async ({
  page,
}) => {
  await setUpTripWithEntries(page);

  await expect(
    shown(page.getByText(text.detail.unlabelled.replace("{n}", "2"))),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: text.detail.addThem.replace("{name}", "Vietnam"),
    })
    .click();
  await expect(
    toast(
      page,
      text.notices.labelled.replace("{n}", "2").replace("{name}", "Vietnam"),
    ),
  ).toBeVisible();

  const summary = shown(
    page.getByRole("region", { name: "Vietnam", exact: true }),
  );
  await expect(summary.getByText("₭100,000.00", { exact: true })).toBeVisible();
  await expect(summary.getByText("$20.00", { exact: true })).toBeVisible();
  await expect(
    summary.getByText(text.detail.entries.replace("{n}", "2"), { exact: true }),
  ).toBeVisible();
  await expect(
    shown(page.getByText(text.detail.unlabelled.replace("{n}", "2"))),
  ).toHaveCount(0);
  await expect(
    shown(page.getByRole("heading", { name: text.detail.whereMoneyWent })),
  ).toHaveCount(2);

  await shown(
    page.getByRole("link", { name: text.detail.seeAll.replace("{n}", "2") }),
  ).click();
  await expect(page).toHaveURL(/\/transactions\?trip=[0-9a-f-]{36}&month=all$/);
  await expect(shown(page.getByText("Noodles in Hue"))).toBeVisible();
  await expect(shown(page.getByText("Coffee in Hanoi"))).toBeVisible();
  await expect(shown(page.getByText("Lunch back home"))).toHaveCount(0);
});

test("History offers a Trip filter only once there is a trip", async ({
  page,
}) => {
  await setUpTripWithEntries(page);
  await page
    .getByRole("button", {
      name: text.detail.addThem.replace("{name}", "Vietnam"),
    })
    .click();
  await expect(
    toast(
      page,
      text.notices.labelled.replace("{n}", "2").replace("{name}", "Vietnam"),
    ),
  ).toBeVisible();

  await page.goto("/transactions?month=all");
  await expect(shown(page.getByText("Lunch back home"))).toBeVisible();
  await shown(
    page.locator("summary", { hasText: en.transactions.filters.filters }),
  ).click();
  await page
    .getByRole("combobox", { name: en.transactions.filters.trip, exact: true })
    .selectOption({ label: "Vietnam" });
  await page
    .getByRole("button", { name: en.transactions.filters.apply })
    .click();
  await expect(page).toHaveURL(/trip=[0-9a-f-]{36}/);
  await expect(shown(page.getByText("Noodles in Hue"))).toBeVisible();
  await expect(shown(page.getByText("Lunch back home"))).toHaveCount(0);
});

test("deleting a trip keeps its entries in History", async ({ page }) => {
  await setUpTripWithEntries(page);
  await page
    .getByRole("button", {
      name: text.detail.addThem.replace("{name}", "Vietnam"),
    })
    .click();
  await expect(
    toast(
      page,
      text.notices.labelled.replace("{n}", "2").replace("{name}", "Vietnam"),
    ),
  ).toBeVisible();

  await shown(page.getByRole("link", { name: text.edit })).click();
  await shown(page.getByRole("button", { name: text.delete })).click();
  await page.getByRole("button", { name: text.deleteYes }).click();
  await expect(toast(page, text.notices.deleted)).toBeVisible();
  await expect(page).toHaveURL(/\/trips$/);
  await expect(shown(page.getByText(text.empty))).toBeVisible();

  await page.goto("/transactions?month=all");
  await expect(shown(page.getByText("Noodles in Hue"))).toBeVisible();
  await expect(shown(page.getByText("Coffee in Hanoi"))).toBeVisible();
  await expect(shown(page.getByText("Lunch back home"))).toBeVisible();
});

function tripBox(page: Page) {
  return shown(
    page.getByRole("combobox", {
      name: en.transactions.form.trip,
      exact: true,
    }),
  );
}

const filledIn = /Filled in because .* is during this trip\./;

test("Add opens with the trip that holds today, and the entry lands on the trip", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addTrip(page, { name: "Vietnam", from: day(-1), to: day(2) });
  const tripUrl = new URL(page.url()).pathname;

  await openAddForm(page);
  await expect(tripBox(page).locator("option:checked")).toContainText(
    "Vietnam",
  );
  await expect(shown(page.getByText(filledIn))).toBeVisible();
  await fillEntry(page, { amount: "45,000", category: "Food" });
  await waitForSaved(page);

  await page.goto(tripUrl);
  const summary = shown(
    page.getByRole("region", { name: "Vietnam", exact: true }),
  );
  await expect(summary.getByText("₭45,000.00", { exact: true })).toBeVisible();
});

test("the cross clears the trip, so the entry is not on the trip", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addTrip(page, { name: "Vietnam", from: day(-1), to: day(2) });
  const tripUrl = new URL(page.url()).pathname;

  await openAddForm(page);
  await expect(tripBox(page).locator("option:checked")).toContainText(
    "Vietnam",
  );
  await shown(
    page.getByRole("button", { name: en.transactions.form.removeTrip }),
  ).click();
  await expect(tripBox(page).locator("option:checked")).toHaveText(
    en.transactions.form.noTrip,
  );
  await fillEntry(page, { amount: "45,000", category: "Food" });
  await waitForSaved(page);

  await page.goto(tripUrl);
  await expect(shown(page.getByText(text.detail.nothingSpent))).toBeVisible();
  await expect(shown(page.getByText(text.detail.unlabelledOne))).toBeVisible();
});

test("an entry outside the trip's days can be given the trip when edited", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addTrip(page, { name: "Vietnam", from: day(-1), to: day(2) });
  const tripUrl = new URL(page.url()).pathname;
  await addEntry(page, {
    amount: "45,000",
    category: "Food",
    date: day(-20),
    note: "Old lunch",
  });

  await page.goto("/transactions?month=all");
  await shown(page.getByRole("link", { name: /Food.*-₭45,000\.00/ })).click();
  await expect(tripBox(page).locator("option:checked")).toHaveText(
    en.transactions.form.noTrip,
  );
  const label = await tripBox(page)
    .locator("option", { hasText: "Vietnam" })
    .textContent();
  await tripBox(page).selectOption({ label: label ?? "" });
  await expect(shown(page.getByText(filledIn))).toHaveCount(0);
  await saveButton(page).click();
  // The Edit address already passes waitForSaved, so wait for History instead
  await expect(page).toHaveURL(/\/transactions$/);

  await page.goto(tripUrl);
  const summary = shown(
    page.getByRole("region", { name: "Vietnam", exact: true }),
  );
  await expect(summary.getByText("₭45,000.00", { exact: true })).toBeVisible();
});

test("the Trip field follows the date until it is touched, and is absent without trips", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await openAddForm(page);
  await expect(shown(page.getByLabel(en.transactions.form.date))).toBeVisible();
  await expect(tripBox(page)).toHaveCount(0);

  await addTrip(page, { name: "Vietnam", from: day(-1), to: day(2) });
  await openAddForm(page);
  await dateBox(page).fill(day(-20));
  await expect(tripBox(page).locator("option:checked")).toHaveText(
    en.transactions.form.noTrip,
  );
  await dateBox(page).fill(day(0));
  await expect(tripBox(page).locator("option:checked")).toContainText(
    "Vietnam",
  );
  await tripBox(page).selectOption({ label: en.transactions.form.noTrip });
  await dateBox(page).fill(day(1));
  await expect(tripBox(page).locator("option:checked")).toHaveText(
    en.transactions.form.noTrip,
  );
});
