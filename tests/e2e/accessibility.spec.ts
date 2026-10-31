import AxeBuilder from "@axe-core/playwright";
import { expect as baseExpect, test, type Page } from "@playwright/test";
import { en } from "../../src/messages/en";
import { accountRows, addAccount, addEntry, signUpAndConfirm } from "./helpers";

test.describe.configure({ timeout: 300_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 30_000 });

const schemes = ["light", "dark"] as const;

// Runs the checker and fails with each problem's rule, help text and first three elements
async function expectNoProblems(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const report = violations
    .map(
      ({ id, help, nodes }) =>
        `${id}: ${help} -> ${nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join(" | ")}`,
    )
    .join("\n");
  expect(violations, `${label}\n${report}`).toEqual([]);
}

// Opens a page and waits for its heading and the end of any loading screen before checking it
async function checkPage(page: Page, path: string, scheme: string) {
  await page.goto(path);
  await expect(page.locator("h1").first()).toBeAttached();
  await expect(
    page.getByRole("status").filter({ hasText: en.common.loading }),
  ).toHaveCount(0);
  await expectNoProblems(page, `${path} (${scheme})`);
}

test("signed-in pages have no accessibility problems", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "Cash", amount: "1,000,000" });
  await addEntry(page, { amount: "45,000", category: "Food" });

  await page.goto("/accounts");
  await accountRows(page, "Cash").click();
  await expect(page).toHaveURL(/\/accounts\/[0-9a-f-]{36}$/);
  const accountPath = new URL(page.url()).pathname;

  const paths = [
    "/",
    "/transactions",
    "/transactions/new",
    "/accounts",
    accountPath,
    "/accounts/new",
    `${accountPath}/edit`,
    `${accountPath}/fix-balance`,
    "/budgets",
    "/budgets/new",
    "/goals",
    "/goals/new",
    "/settings",
    "/settings/categories",
  ];
  for (const scheme of schemes) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const path of paths) await checkPage(page, path, scheme);
  }
});

test("signed-out pages have no accessibility problems", async ({ page }) => {
  for (const scheme of schemes) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const path of ["/login", "/forgot-password", "/no-such-page"]) {
      await checkPage(page, path, scheme);
    }
  }
});
