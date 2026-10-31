import { Suspense } from "react";
import { BackLink } from "@/components/shared/back-link";
import { FormSkeleton, LoadingStatus } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { GoalForm } from "@/modules/goals";
import { CURRENCY_CODES, isCurrencyCode } from "@/modules/money";
import { getProfile } from "@/modules/profile";

export default function NewGoalPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <BackLink href="/goals" label={en.goals.back} />
      <Suspense
        fallback={
          <>
            <LoadingStatus />
            <FormSkeleton title={en.goals.newTitle} />
          </>
        }
      >
        <NewGoalContent />
      </Suspense>
    </div>
  );
}

async function NewGoalContent() {
  const profile = await getProfile();
  return (
    <GoalForm
      mode="create"
      title={en.goals.newTitle}
      defaultCurrency={
        isCurrencyCode(profile.baseCurrency)
          ? profile.baseCurrency
          : CURRENCY_CODES[0]
      }
    />
  );
}
