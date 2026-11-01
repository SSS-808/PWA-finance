import { expect, test } from "@playwright/test";
import { en } from "../../src/messages/en";
import { addAccount, logOutFromSettings, signUpAndConfirm } from "./helpers";

// The offline helper only starts in a built app, which is what CI runs (locally: CI=1 pnpm test:e2e)
test.skip(!process.env.CI, "The offline helper only runs in a built app");
test.use({ serviceWorkers: "allow" });
test.describe.configure({ timeout: 90_000 });

function savedPageCount() {
  return caches
    .keys()
    .then((names) => names.filter((name) => name.startsWith("pages-")).length);
}

test("pages opened online still open offline, and log-out forgets them", async ({
  context,
  page,
}) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Offline cash", amount: "100,000" });
  await page.evaluate(() => navigator.serviceWorker.ready);

  await page.goto("/accounts");
  await expect(page.getByText("Offline cash").first()).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        Boolean(await caches.match("/accounts", { ignoreVary: true })),
      ),
    )
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Offline cash").first()).toBeVisible();
  await expect(page.getByText(/^Offline\. Saved copy from /)).toBeVisible();

  // A form is never saved, so it shows the offline page instead
  await page.goto("/transactions/new");
  await expect(
    page.getByRole("heading", { name: en.offline.title }),
  ).toBeVisible();

  await context.setOffline(false);
  await page.goto("/accounts");
  await expect(page.getByText(/^Offline\./)).toBeHidden();
  await logOutFromSettings(page);
  await expect.poll(() => page.evaluate(savedPageCount)).toBe(0);
});
