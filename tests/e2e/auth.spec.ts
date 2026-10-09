import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { en } from "../../src/messages/en";

const MAILPIT = "http://127.0.0.1:54324";
const PASSWORD = "e2e-password-123";
const NEW_PASSWORD = "e2e-new-password-456";

// The demo user's email and password come from the seed so they are written down once
const seed = readFileSync("supabase/seed.sql", "utf8");
const DEMO_EMAIL = /'([^']+@wallet\.test)'/.exec(seed)?.[1] ?? "";
const DEMO_PASSWORD = /crypt\(\s*'([^']+)'/.exec(seed)?.[1] ?? "";

test.describe.configure({ timeout: 60_000 });

type MailSummary = { ID: string };
type MailSearch = { messages?: MailSummary[] };
type MailMessage = { HTML?: string };

function uniqueEmail(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `e2e-${Date.now()}-${random}@wallet.test`;
}

// Polls the local inbox until a message for this address holds an /auth/confirm link of this type
async function waitForLink(
  email: string,
  type: "email" | "recovery",
): Promise<string> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const { messages = [] } = (await search.json()) as MailSearch;
    for (const { ID } of messages) {
      const response = await fetch(`${MAILPIT}/api/v1/message/${ID}`);
      const { HTML = "" } = (await response.json()) as MailMessage;
      const match = /href="([^"]*\/auth\/confirm[^"]*)"/.exec(HTML);
      const link = match?.[1]?.replaceAll("&amp;", "&");
      if (link?.includes(`type=${type}`)) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No ${type} email arrived for ${email}`);
}

// A role locator skips the hidden copy of the previous page that Next.js keeps after a client-side navigation
function emailBox(page: Page) {
  return page.getByRole("textbox", { name: en.auth.fields.email });
}

async function fillCredentials(page: Page, email: string, password: string) {
  await emailBox(page).fill(email);
  await page
    .getByLabel(en.auth.fields.password, { exact: true })
    .fill(password);
}

async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await fillCredentials(page, email, password);
  await page.getByRole("button", { name: en.auth.login.submit }).click();
}

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await fillCredentials(page, email, PASSWORD);
  await page.getByRole("button", { name: en.auth.signup.submit }).click();
  await expect(
    page.getByRole("heading", { name: en.auth.signup.sentTitle }),
  ).toBeVisible();
}

function greeting(email: string): string {
  return en.home.greeting.replace("{email}", email);
}

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

  await page.getByRole("button", { name: en.auth.logout }).click();
  await expect(page).toHaveURL(/\/login$/);
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
  const email = uniqueEmail();
  await signUp(page, email);
  await page.goto(await waitForLink(email, "email"));
  await page.getByRole("button", { name: en.auth.logout }).click();
  await expect(page).toHaveURL(/\/login$/);

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

  await page.getByRole("button", { name: en.auth.logout }).click();
  await expect(page).toHaveURL(/\/login$/);
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
