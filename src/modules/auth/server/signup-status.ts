import "server-only";
import { cacheLife } from "next/cache";
import { env } from "@/lib/env";
import { signupOpenFrom } from "../domain/signup";

// Null means Supabase could not be asked
async function askSupabase(): Promise<boolean | null> {
  try {
    const response = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
      {
        headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!response.ok) return null;
    return signupOpenFrom(await response.json());
  } catch {
    return null;
  }
}

// Asks Supabase whether new accounts can be created; the answer is reused for a few minutes
export async function isSignupOpen(): Promise<boolean> {
  "use cache";

  const open = await askSupabase();
  // A failed check counts as closed, but is forgotten within seconds so one slow answer can't stick
  if (open === null) {
    cacheLife("seconds");
    return false;
  }
  cacheLife("minutes");
  return open;
}
