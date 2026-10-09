import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "last_account_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// The account used for the last saved entry, remembered on this device
export async function readLastAccountId(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_NAME)?.value;
}

export async function rememberAccount(accountId: string): Promise<void> {
  (await cookies()).set(COOKIE_NAME, accountId, {
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
    httpOnly: true,
  });
}
