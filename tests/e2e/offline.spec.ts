import { expect, test } from "@playwright/test";
import { en } from "../../src/messages/en";
import {
  addAccount,
  fillEntry,
  logOutFromSettings,
  openAddForm,
  signUpAndConfirm,
  transferButton,
} from "./helpers";

// The offline helper only starts in a built app, which is what CI runs (locally: CI=1 pnpm test:e2e)
test.skip(!process.env.CI, "The offline helper only runs in a built app");
test.use({ serviceWorkers: "allow" });
test.describe.configure({ timeout: 90_000 });

function savedPageCount() {
  return caches
    .keys()
    .then((names) => names.filter((name) => name.startsWith("pages-")).length);
}

function isSaved(path: string) {
  return caches
    .match(path, { ignoreVary: true })
    .then((response) => Boolean(response));
}

test("main pages open offline even if never opened, and log-out forgets them", async ({
  context,
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Offline cash", amount: "100,000" });
  await page.evaluate(() => navigator.serviceWorker.ready);

  await page.goto("/accounts");
  await expect(page.getByText("Offline cash").first()).toBeVisible();
  await expect.poll(() => page.evaluate(isSaved, "/accounts")).toBe(true);
  // Budgets was never opened, so only the background saving can have kept it
  await expect.poll(() => page.evaluate(isSaved, "/budgets")).toBe(true);
  await expect
    .poll(() => page.evaluate(isSaved, "/transactions/new"))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Offline cash").first()).toBeVisible();
  await expect(page.getByText(/^Offline\. Saved copy from /)).toBeVisible();

  await page.goto("/budgets");
  await expect(
    page.getByRole("heading", { name: en.budgets.title, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/^Offline\. Saved copy from /)).toBeVisible();

  // Add opens from its saved copy, Transfer is greyed, and an expense waits on the phone
  await openAddForm(page);
  await expect(transferButton(page)).toHaveAttribute("aria-disabled", "true");
  await transferButton(page).click();
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: en.outbox.transferOffline }),
  ).toBeVisible();
  await fillEntry(page, { amount: "5,000", category: "Food" });
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: en.outbox.savedOnPhone }),
  ).toBeVisible();

  await context.setOffline(false);
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: en.outbox.sentOne }),
  ).toBeVisible();
  await page.goto("/accounts");
  await expect(page.getByText(/^Offline\./)).toBeHidden();
  await logOutFromSettings(page);
  await expect.poll(() => page.evaluate(savedPageCount)).toBe(0);
});
