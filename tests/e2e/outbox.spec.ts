import {
  expect as baseExpect,
  test,
  type Locator,
  type Page,
  type Route,
} from "@playwright/test";
import { en } from "../../src/messages/en";
import {
  accountRows,
  addAccount,
  amountBox,
  fillEntry,
  logIn,
  openAddForm,
  openSettings,
  signUpAndConfirm,
} from "./helpers";

test.describe.configure({ timeout: 90_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

function shown(locator: Locator) {
  return locator.filter({ visible: true });
}

function toast(page: Page, message: string) {
  return page.locator("[data-sonner-toast]").filter({ hasText: message });
}

// Only the outbox's own server action is cut off, so every other action still works
function isOutboxSend(route: Route): boolean {
  const request = route.request();
  return (
    request.method() === "POST" &&
    Boolean(request.headers()["next-action"]) &&
    (request.postData() ?? "").includes("releaseGoals")
  );
}

function cutOff(route: Route) {
  return isOutboxSend(route)
    ? route.abort("internetdisconnected")
    : route.continue();
}

async function blockSends(page: Page) {
  await page.route("**/*", cutOff);
}

async function unblockSends(page: Page) {
  await page.unroute("**/*", cutOff);
}

function outboxSize(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const opening = indexedDB.open("wallet-outbox");
        opening.onerror = () => reject(opening.error);
        opening.onsuccess = () => {
          const count = opening.result
            .transaction("entries")
            .objectStore("entries")
            .count();
          count.onsuccess = () => resolve(count.result);
          count.onerror = () => reject(count.error);
        };
      }),
  );
}

test("an entry that can't be sent waits on the phone, then is sent once", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100,000" });

  await blockSends(page);
  await openAddForm(page);
  await fillEntry(page, {
    amount: "5,000",
    category: "Food",
    note: "Offline lunch",
  });
  await expect(toast(page, en.outbox.savedOnPhone)).toBeVisible();
  await expect(amountBox(page)).toHaveValue("");
  await expect(page).toHaveURL(/\/transactions\/new/);

  await page.goto("/");
  await shown(
    page.getByRole("link", { name: new RegExp(en.outbox.homeWaitingOne) }),
  ).click();
  await expect(page).toHaveURL(/\/waiting$/);
  await expect(
    shown(
      page.getByRole("heading", {
        name: en.outbox.waitingHeading.replace("{count}", "1"),
      }),
    ),
  ).toBeVisible();
  await expect(shown(page.getByText("Offline lunch"))).toBeVisible();

  await unblockSends(page);
  await page.getByRole("button", { name: en.outbox.sendNow }).click();
  await expect(toast(page, en.outbox.sentOne)).toBeVisible();
  await expect(shown(page.getByText(en.outbox.empty))).toBeVisible();

  await page
    .getByRole("navigation", { name: en.nav.label })
    .getByRole("link", { name: en.nav.history })
    .click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(shown(page.getByText("Offline lunch"))).toHaveCount(1);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: en.dashboard.title }),
  ).toBeAttached();
  await expect(page.getByText(en.outbox.homeWaitingOne)).toHaveCount(0);
  expect(await outboxSize(page)).toBe(0);
});

test("log-out warns about entries on the phone and deletes them if asked", async ({
  page,
}) => {
  const { email, password } = await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100,000" });

  await blockSends(page);
  await openAddForm(page);
  await fillEntry(page, { amount: "1,000", category: "Food", note: "First" });
  await expect(toast(page, en.outbox.savedOnPhone)).toBeVisible();
  await fillEntry(page, { amount: "2,000", category: "Food", note: "Second" });
  await expect(toast(page, en.outbox.savedOnPhone)).toHaveCount(2);

  await page.goto("/waiting");
  await expect(
    shown(
      page.getByRole("heading", {
        name: en.outbox.waitingHeading.replace("{count}", "2"),
      }),
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Delete / })
    .first()
    .click();
  await expect(
    shown(
      page.getByRole("heading", {
        name: en.outbox.waitingHeading.replace("{count}", "1"),
      }),
    ),
  ).toBeVisible();

  await openSettings(page);
  await page.getByRole("button", { name: en.auth.logout }).click();
  const dialog = page.getByRole("dialog", { name: en.outbox.logoutTitleOne });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: en.outbox.logoutStay }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/settings$/);

  await page.getByRole("button", { name: en.auth.logout }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: en.outbox.logoutAnyway }).click();
  await expect(page).toHaveURL(/\/login$/);

  await logIn(page, email, password);
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { level: 1, name: en.dashboard.title }),
  ).toBeAttached();
  await expect(page.getByText(en.outbox.homeWaitingOne)).toHaveCount(0);
  expect(await outboxSize(page)).toBe(0);
});

test("an entry the server refuses is listed with a reason", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "100,000" });

  await blockSends(page);
  await openAddForm(page);
  await fillEntry(page, {
    amount: "3,000",
    category: "Food",
    note: "Too late",
  });
  await expect(toast(page, en.outbox.savedOnPhone)).toBeVisible();

  // The account goes away while the entry waits
  await page.goto("/accounts");
  await accountRows(page, "Cash").first().click();
  await page.getByRole("button", { name: en.accounts.detail.archive }).click();
  await page
    .getByRole("button", { name: en.accounts.detail.archiveYes })
    .click();
  await expect(page).toHaveURL(/\/accounts$/);

  await page.goto("/waiting");
  await unblockSends(page);
  await page.getByRole("button", { name: en.outbox.sendNow }).click();
  await expect(
    shown(
      page.getByRole("heading", {
        name: en.outbox.refusedHeading.replace("{count}", "1"),
      }),
    ),
  ).toBeVisible();
  await expect(
    shown(page.getByText(en.outbox.reasons.account_required)),
  ).toBeVisible();
});
