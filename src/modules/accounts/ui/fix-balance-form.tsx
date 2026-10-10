"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { type CurrencyCode, currencySymbol } from "@/modules/money";
import type { AccountErrorKey, FixBalanceState } from "../domain/types";
import { fixBalance } from "../server/actions";

// Matches the length check on the transactions table
const MAX_NOTE_LENGTH = 200;

const idleState: FixBalanceState = { status: "idle" };

function FieldMessage({ id, error }: { id: string; error?: AccountErrorKey }) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {en.accounts.errors[error]}
    </p>
  );
}

export function FixBalanceForm({
  id,
  currency,
  owing,
}: {
  id: string;
  currency: CurrencyCode;
  owing: boolean;
}) {
  const uid = useId();
  const [state, formAction] = useActionState(
    fixBalance.bind(null, id),
    idleState,
  );
  const fieldErrors = state.fieldErrors ?? {};
  // Values from the last submit win, so the form reset keeps what was typed
  const values = state.values ?? { amount: "", note: "" };

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {en.accounts.errors[state.error]}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${uid}-amount`} className="text-base">
          {owing ? en.accounts.fix.debtLabel : en.accounts.fix.assetLabel}
        </Label>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-3xl text-muted-foreground">
            {currencySymbol(currency)}
          </span>
          <Input
            id={`${uid}-amount`}
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            defaultValue={values.amount}
            aria-invalid={Boolean(fieldErrors.amount)}
            aria-describedby={
              fieldErrors.amount ? `${uid}-amount-error` : undefined
            }
            className="h-16 text-3xl font-semibold tabular-nums md:text-3xl"
          />
        </div>
        <FieldMessage id={`${uid}-amount-error`} error={fieldErrors.amount} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-note`} className="text-base">
          {en.accounts.fix.note}
        </Label>
        <Input
          id={`${uid}-note`}
          name="note"
          autoComplete="off"
          maxLength={MAX_NOTE_LENGTH}
          placeholder={en.accounts.fix.noteHint}
          defaultValue={values.note}
          className="h-12 text-base"
        />
      </div>
      <div className="space-y-3">
        <SubmitButton
          label={en.accounts.fix.submit}
          pendingLabel={en.accounts.fix.submitting}
        />
        <Button asChild variant="outline" className="h-12 w-full text-base">
          <Link href={`/accounts/${id}`}>{en.accounts.form.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
