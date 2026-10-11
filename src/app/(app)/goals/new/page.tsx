import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { en } from "@/messages/en";
import { GoalForm } from "@/modules/goals";
import { CURRENCY_CODES, isCurrencyCode } from "@/modules/money";
import { getProfile } from "@/modules/profile";

export default function NewGoalPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <Link
        href="/goals"
        className="inline-flex min-h-12 items-center gap-2 text-base text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {en.goals.back}
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.goals.newTitle}
      </h1>
      <Suspense>
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
      defaultCurrency={
        isCurrencyCode(profile.baseCurrency)
          ? profile.baseCurrency
          : CURRENCY_CODES[0]
      }
    />
  );
}
