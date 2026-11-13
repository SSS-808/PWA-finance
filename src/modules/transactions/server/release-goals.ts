import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfile, todayIn } from "@/modules/profile";

// The generated types leave out that p_goal_id may be null, which means every goal in the account
const EVERY_GOAL = null as unknown as string;

// The payment is already saved, so a failure is only logged and the goal page shows the warning instead
export async function releaseGoalMoney(
  accountId: string,
  wanted: boolean,
): Promise<void> {
  if (!wanted) return;
  const profile = await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_goal_shortfall", {
    p_account_id: accountId,
    p_goal_id: EVERY_GOAL,
    p_on: todayIn(profile.timeZone),
  });
  if (error) {
    console.error("Could not take the spent money out of the goals", {
      code: error.code,
      message: error.message,
    });
  }
}
