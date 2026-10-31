"use client";

import { useActionState, useId } from "react";
import { AmountInput } from "@/components/shared/amount-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { type CurrencyCode, currencySymbol } from "@/modules/money";
import type { ContributionFormState } from "../domain/types";
import { addContribution } from "../server/actions";

const idleState: ContributionFormState = { status: "idle" };

// One amount box, two buttons: the button pressed decides whether money goes in or comes out
export function ContributionForm({
  goalId,
  currency,
}: {
  goalId: string;
  currency: CurrencyCode;
}) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(
    addContribution.bind(null, goalId),
    idleState,
  );
  const fieldErrors = state.fieldErrors ?? {};
  const amountError = fieldErrors.amount;
  // A bad direction can't come from the buttons, so it is shown as a general error
  const generalError = state.error ?? fieldErrors.direction;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      {generalError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {en.goals.errors[generalError]}
        </p>
      ) : null}
      <div className="space-y-1 rounded-xl border border-border px-4 py-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <Label
          htmlFor={`${uid}-amount`}
          className="text-sm font-normal text-muted-foreground"
        >
          {en.goals.money.amount}
        </Label>
        <div className="flex items-baseline gap-2">
          <span
            aria-hidden="true"
            className="text-3xl font-semibold text-muted-foreground"
          >
            {currencySymbol(currency)}
          </span>
          <AmountInput
            id={`${uid}-amount`}
            name="amount"
            defaultValue={state.values?.amount ?? ""}
            aria-invalid={Boolean(amountError)}
            aria-describedby={amountError ? `${uid}-amount-error` : undefined}
            className="h-auto rounded-none border-0 bg-transparent p-0 text-4xl font-semibold tracking-tight tabular-nums shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-4xl dark:bg-transparent"
          />
        </div>
        {amountError ? (
          <p id={`${uid}-amount-error`} className="text-sm text-destructive">
            {en.goals.errors[amountError]}
          </p>
        ) : null}
      </div>
      <div className="flex gap-3">
        <Button
          type="submit"
          name="direction"
          value="add"
          disabled={pending}
          className="h-12 flex-1 text-base"
        >
          {en.goals.money.add}
        </Button>
        <Button
          type="submit"
          name="direction"
          value="take"
          variant="outline"
          disabled={pending}
          className="h-12 flex-1 text-base"
        >
          {en.goals.money.take}
        </Button>
      </div>
    </form>
  );
}
