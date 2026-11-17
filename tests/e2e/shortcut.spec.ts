import { expect as baseExpect, test } from "@playwright/test";
import { en } from "../../src/messages/en";
import { addAccount, openSettings, signUpAndConfirm } from "./helpers";

test.describe.configure({ timeout: 180_000 });

// The dev server compiles each page the first time it is opened
const expect = baseExpect.configure({ timeout: 15_000 });

const text = en.shortcut.settings;

test("a key is made, used, shown as used and deleted", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "BCEL One", amount: "1,000,000" });

  await openSettings(page);
  await page
    .getByRole("link", { name: new RegExp(text.rowLabel) })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/settings\/shortcut$/);
  await page
    .getByRole("link", { name: text.makeKey })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/\/settings\/shortcut\/new$/);

  await page.getByRole("button", { name: text.form.submit }).click();
  const shown = page.getByText(/^pw_[A-Za-z0-9_-]{43}$/);
  await expect(shown).toBeVisible();
  const key = (await shown.textContent()) ?? "";
  await expect(page.getByText(text.created.shownOnce)).toBeVisible();

  const response = await page.request.post("/api/shortcut", {
    headers: { Authorization: `Bearer ${key}` },
    data: { amount: "25,000", category: "Food", note: "Shortcut lunch" },
  });
  expect(response.status()).toBe(201);
  expect(await response.json()).toMatchObject({
    message: "Saved: Food -₭25,000.00 (BCEL One)",
  });

  await page.goto("/transactions");
  await expect(page.getByText("Shortcut lunch").first()).toBeVisible();

  await page.goto("/settings/shortcut");
  await expect(page.getByText(/^Last used /)).toBeVisible();

  await page
    .getByRole("button", {
      name: text.delete.label.replace("{name}", "iPhone"),
    })
    .click();
  await page.getByRole("button", { name: text.delete.confirm }).click();
  await expect(page).toHaveURL(/\/settings\/shortcut/);
  await expect(page.getByText(text.noKeysLine)).toBeVisible();

  const after = await page.request.post("/api/shortcut", {
    headers: { Authorization: `Bearer ${key}` },
    data: { amount: "25,000", category: "Food" },
  });
  expect(after.status()).toBe(401);
});

test("a request with no key is refused and adds nothing", async ({ page }) => {
  await signUpAndConfirm(page);
  await addAccount(page, { name: "BCEL One", amount: "1,000,000" });

  const response = await page.request.post("/api/shortcut", {
    data: { amount: "25,000", category: "Food", note: "No key lunch" },
  });
  expect(response.status()).toBe(401);

  await page.goto("/transactions");
  await expect(page.getByText("No key lunch")).toHaveCount(0);
});
