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

// The dev server compiles each page the first time it is opened
const patient = expect.configure({ timeout: 15_000 });

export type NewAccount = {
  name: string;
  type?: string;
  currency?: string;
  amount?: string;
};

export type Entry = {
  amount: string;
  category: string;
  kind?: "income";
  account?: string;
  date?: string;
  note?: string;
};

export type NewTransfer = {
  from: string;
  to: string;
  amount: string;
  arrived?: string;
  note?: string;
};

export function amountBox(page: Page) {
  return page.getByRole("textbox", {
    name: en.transactions.form.amount,
    exact: true,
  });
}

export function accountBox(page: Page) {
  return page.getByRole("combobox", {
    name: en.transactions.form.account,
    exact: true,
  });
}

export function dateBox(page: Page) {
  return page.getByLabel(en.transactions.form.date, { exact: true });
}

export function noteBox(page: Page) {
  return page.getByRole("textbox", { name: en.transactions.form.note });
}

export function chip(page: Page, name: string) {
  return page.getByRole("radio", { name, exact: true });
}

export function saveButton(page: Page) {
  return page.getByRole("button", { name: en.transactions.form.submit });
}

export function fromBox(page: Page) {
  return page.getByRole("combobox", {
    name: en.transactions.transfer.from,
    exact: true,
  });
}

export function toBox(page: Page) {
  return page.getByRole("combobox", {
    name: en.transactions.transfer.to,
    exact: true,
  });
}

export function arrivedBox(page: Page) {
  return page.getByRole("textbox", {
    name: en.transactions.transfer.arrived,
    exact: true,
  });
}

export function transferButton(page: Page) {
  return page.getByRole("button", { name: en.transactions.kinds.transfer });
}

export async function addAccount(page: Page, account: NewAccount) {
  await page.goto("/accounts/new");
  await page
    .getByRole("textbox", { name: en.accounts.form.name, exact: true })
    .fill(account.name);
  await page
    .getByRole("combobox", { name: en.accounts.form.type, exact: true })
    .selectOption(account.type ?? "cash");
  await page
    .getByRole("combobox", { name: en.accounts.form.currency, exact: true })
    .selectOption(account.currency ?? "LAK");
  if (account.amount) {
    await page.getByRole("textbox", { name: /now\?$/ }).fill(account.amount);
  }
  await page.getByRole("button", { name: en.accounts.form.submitNew }).click();
  await patient(page).toHaveURL(/\/accounts$/);
}

// Fills the Add form that is already open and saves it
export async function fillEntry(page: Page, entry: Entry) {
  if (entry.kind === "income") {
    await page
      .getByRole("button", { name: en.transactions.kinds.income })
      .click();
  }
  if (entry.account)
    await accountBox(page).selectOption({ label: entry.account });
  await amountBox(page).fill(entry.amount);
  await chip(page, entry.category).check();
  if (entry.date) await dateBox(page).fill(entry.date);
  if (entry.note) await noteBox(page).fill(entry.note);
  await saveButton(page).click();
}

// The form's code loads after the page; typing before that would be wiped, so wait until the kind buttons work
export async function openAddForm(page: Page, url = "/transactions/new") {
  await page.goto(url);
  const income = page.getByRole("button", {
    name: en.transactions.kinds.income,
  });
  const expense = page.getByRole("button", {
    name: en.transactions.kinds.expense,
  });
  await patient(async () => {
    await income.click();
    await patient(income).toHaveAttribute("aria-pressed", "true", {
      timeout: 1000,
    });
  }).toPass();
  await expense.click();
  await patient(expense).toHaveAttribute("aria-pressed", "true");
}

// Waits until the save redirect has left the Add form and the toast param is gone from the URL
export async function waitForSaved(page: Page) {
  await patient(page).toHaveURL(
    (url) =>
      !url.pathname.startsWith("/transactions/new") &&
      !url.searchParams.has("saved") &&
      !url.searchParams.has("saved_transfer"),
  );
}

export async function addEntry(page: Page, entry: Entry) {
  await openAddForm(page);
  await fillEntry(page, entry);
  await waitForSaved(page);
}

// The form's code loads after the page; clicking Transfer before that does nothing, so retry until it switches
export async function openTransferForm(
  page: Page,
  url = "/transactions/new?from=%2Faccounts",
) {
  await page.goto(url);
  await patient(async () => {
    await transferButton(page).click();
    await patient(transferButton(page)).toHaveAttribute(
      "aria-pressed",
      "true",
      { timeout: 1000 },
    );
  }).toPass();
}

export async function fillTransfer(page: Page, transfer: NewTransfer) {
  await fromBox(page).selectOption({ label: transfer.from });
  await toBox(page).selectOption({ label: transfer.to });
  await amountBox(page).fill(transfer.amount);
  if (transfer.arrived) await arrivedBox(page).fill(transfer.arrived);
  if (transfer.note) await noteBox(page).fill(transfer.note);
  await saveButton(page).click();
}

// Opens Add from Accounts, makes the transfer and lands back on Accounts
export async function addTransfer(page: Page, transfer: NewTransfer) {
  await openTransferForm(page);
  await fillTransfer(page, transfer);
  await waitForSaved(page);
}
