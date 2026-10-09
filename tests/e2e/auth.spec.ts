import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { en } from "../../src/messages/en";
import {
  PASSWORD,
  emailBox,
  greeting,
  logIn,
  logOutFromSettings,
  signUp,
  signUpAndConfirm,
  uniqueEmail,
  waitForLink,
} from "./helpers";

const NEW_PASSWORD = "e2e-new-password-456";

// The demo user's email and password come from the seed so they are written down once
const seed = readFileSync("supabase/seed.sql", "utf8");
const DEMO_EMAIL = /'([^']+@wallet\.test)'/.exec(seed)?.[1] ?? "";
const DEMO_PASSWORD = /crypt\(\s*'([^']+)'/.exec(seed)?.[1] ?? "";

test.describe.configure({ timeout: 60_000 });

test("a logged-out visit to the home page ends on the login page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { level: 1, name: en.auth.login.title }),
  ).toBeVisible();
});

test("sign up, confirm by email, see the home page, then log out", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await expect(page.getByText(email)).toBeVisible();

  await page.goto(await waitForLink(email, "email"));
  await expect(page).toHaveURL("/");
  await expect(page.getByText(greeting(email))).toBeVisible();

  await logOutFromSettings(page);
});

test("a wrong password shows an error and keeps the typed email", async ({
  page,
}) => {
  await logIn(page, DEMO_EMAIL, "not-the-right-password");
  await expect(
    page.getByText(en.auth.errors.invalid_credentials),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(emailBox(page)).toHaveValue(DEMO_EMAIL);
  await expect(
    page.getByLabel(en.auth.fields.password, { exact: true }),
  ).toHaveValue("");
});

test("logging in before confirming the email offers to send it again", async ({
  page,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);

  await logIn(page, email, PASSWORD);
  await expect(
    page.getByText(en.auth.errors.email_not_confirmed),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: en.auth.signup.resend }),
  ).toBeVisible();
});

test("forgot password: reset link, new password, log in with it", async ({
  page,
}) => {
  const { email } = await signUpAndConfirm(page);
  await logOutFromSettings(page);

  await page.getByRole("link", { name: en.auth.login.forgot }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await emailBox(page).fill(email);
  await page.getByRole("button", { name: en.auth.forgot.submit }).click();
  await expect(
    page.getByRole("heading", { name: en.auth.forgot.sentTitle }),
  ).toBeVisible();

  await page.goto(await waitForLink(email, "recovery"));
  await expect(page).toHaveURL(/\/reset-password$/);

  const newPassword = page.getByLabel(en.auth.fields.newPassword, {
    exact: true,
  });
  const confirmPassword = page.getByLabel(en.auth.fields.confirmPassword, {
    exact: true,
  });
  await newPassword.fill(NEW_PASSWORD);
  await confirmPassword.fill(`${NEW_PASSWORD}-different`);
  await page.getByRole("button", { name: en.auth.reset.submit }).click();
  await expect(
    page.getByText(en.auth.errors.passwords_dont_match),
  ).toBeVisible();

  await newPassword.fill(NEW_PASSWORD);
  await confirmPassword.fill(NEW_PASSWORD);
  await page.getByRole("button", { name: en.auth.reset.submit }).click();
  await expect(page).toHaveURL(/\/\?notice=password-updated$/);
  await expect(page.getByText(en.home.passwordUpdated)).toBeVisible();

  await logOutFromSettings(page);
  await logIn(page, email, NEW_PASSWORD);
  await expect(page.getByText(greeting(email))).toBeVisible();
});

test("a logged-in user visiting the login page is sent home", async ({
  page,
}) => {
  await logIn(page, DEMO_EMAIL, DEMO_PASSWORD);
  await expect(page.getByText(greeting(DEMO_EMAIL))).toBeVisible();

  await page.goto("/login");
  await expect(page).toHaveURL("/");
});

test("the seed demo user can log in and sees their email", async ({ page }) => {
  await logIn(page, DEMO_EMAIL, DEMO_PASSWORD);
  await expect(page).toHaveURL("/");
  await expect(page.getByText(greeting(DEMO_EMAIL))).toBeVisible();
});
