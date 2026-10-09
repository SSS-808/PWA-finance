import { expect, type Page } from "@playwright/test";
import { en } from "../../src/messages/en";

const MAILPIT = "http://127.0.0.1:54324";

export const PASSWORD = "e2e-password-123";

type MailSummary = { ID: string };
type MailSearch = { messages?: MailSummary[] };
type MailMessage = { HTML?: string };

export function uniqueEmail(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `e2e-${Date.now()}-${random}@wallet.test`;
}

// Polls the local inbox until a message for this address holds an /auth/confirm link of this type
export async function waitForLink(
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
export function emailBox(page: Page) {
  return page.getByRole("textbox", { name: en.auth.fields.email });
}

export async function fillCredentials(
  page: Page,
  email: string,
  password: string,
) {
  await emailBox(page).fill(email);
  await page
    .getByLabel(en.auth.fields.password, { exact: true })
    .fill(password);
}

export async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await fillCredentials(page, email, password);
  await page.getByRole("button", { name: en.auth.login.submit }).click();
}

export async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await fillCredentials(page, email, PASSWORD);
  await page.getByRole("button", { name: en.auth.signup.submit }).click();
  await expect(
    page.getByRole("heading", { name: en.auth.signup.sentTitle }),
  ).toBeVisible();
}

// Creates a fresh user, confirms the email link and leaves the page on Home, logged in
export async function signUpAndConfirm(
  page: Page,
): Promise<{ email: string; password: string }> {
  const email = uniqueEmail();
  await signUp(page, email);
  await page.goto(await waitForLink(email, "email"));
  await expect(page).toHaveURL("/");
  return { email, password: PASSWORD };
}

// Log out lives in Settings, so go there through the nav first
export async function logOutFromSettings(page: Page) {
  await page.getByRole("link", { name: en.nav.settings }).click();
  await page.getByRole("button", { name: en.auth.logout }).click();
  await expect(page).toHaveURL(/\/login$/);
}

export function greeting(email: string): string {
  return en.home.greeting.replace("{email}", email);
}
