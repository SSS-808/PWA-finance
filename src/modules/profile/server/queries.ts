import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";

export type Profile = {
  displayName: string | null;
  baseCurrency: string;
  timeZone: string;
  email: string;
};

export async function getProfile(): Promise<Profile> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, base_currency, timezone")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Could not load the profile", { cause: error });
  // The sign-up trigger always creates this row, so a missing one is a bug
  if (!data) throw new Error("No profile row for the signed-in user");
  return {
    displayName: data.display_name,
    baseCurrency: data.base_currency,
    timeZone: data.timezone,
    email: user.email,
  };
}
