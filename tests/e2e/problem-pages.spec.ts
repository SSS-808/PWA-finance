import { expect, test, type Page } from "@playwright/test";
import { en } from "../../src/messages/en";
import { signUpAndConfirm } from "./helpers";

test.describe.configure({ timeout: 90_000 });

const widths = [320, 390, 768, 1024, 1280, 1440];
const missingAddress = "/no-such-page";
const missingAccount = "/accounts/00000000-0000-4000-8000-000000000000";

function notFoundHeading(page: Page) {
  return page.getByRole("heading", { name: en.problem.notFoundTitle });
}

function goHome(page: Page) {
  return page.getByRole("link", { name: en.problem.goHome });
}

test("a wrong address shows Page not found and Go to Home leads to Home", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await page.goto(missingAddress);
  await expect(notFoundHeading(page)).toBeVisible();

  await goHome(page).click();
  await expect(page).toHaveURL("/");
});

test("a missing account shows Page not found and keeps the main nav", async ({
  page,
}) => {
  await signUpAndConfirm(page);
  await page.goto(missingAccount);
  await expect(notFoundHeading(page)).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: en.nav.label }),
  ).toBeVisible();
});

test("both not-found pages fit every width and the button stays on screen", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signUpAndConfirm(page);

  for (const path of [missingAddress, missingAccount]) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await expect(notFoundHeading(page)).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      const box = await goHome(page).boundingBox();
      const left = box?.x ?? -1;
      const right = left + (box?.width ?? 0);
      console.log(
        `${path} ${width}px: left=${left}, right=${right}, width=${box?.width}`,
      );
      expect(overflow, `overflow of ${path} at ${width}px`).toBeLessThanOrEqual(
        0,
      );
      expect(left, `left of ${path} at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(right, `right of ${path} at ${width}px`).toBeLessThanOrEqual(
        width,
      );
    }
  }
});
