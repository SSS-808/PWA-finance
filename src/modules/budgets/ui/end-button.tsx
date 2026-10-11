"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import type { CurrencyCode } from "@/modules/money";
import { endBudget } from "../server/actions";

export function EndButton({
  categoryId,
  currency,
}: {
  categoryId: string;
  currency: CurrencyCode;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base"
        onClick={() => setConfirming(true)}
      >
        {en.budgets.end}
      </Button>
    );
  }

  return (
    <form
      action={endBudget.bind(null, categoryId, currency)}
      className="space-y-3"
    >
      <p role="alert" className="text-base">
        {en.budgets.endConfirm}
      </p>
      <SubmitButton
        label={en.budgets.endYes}
        pendingLabel={en.budgets.endYes}
      />
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base"
        onClick={() => setConfirming(false)}
      >
        {en.budgets.form.cancel}
      </Button>
    </form>
  );
}
