"use client";

import { useActionState, useId } from "react";
import { AmountInput } from "@/components/shared/amount-input";
import { SubmitButton } from "@/components/shared/submit-button";
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
  title,
  accountName,
  current,
  currency,
  owing,
}: {
  id: string;
  title: string;
  accountName: string;
  // The balance as the app shows it now, already formatted
  current: string;
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
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-background py-2">
        <h1 className="text-3xl font-semibold tracking-tight break-words">
          {title}
        </h1>
        <SubmitButton
          shape="pill"
          label={en.accounts.fix.submit}
          pendingLabel={en.accounts.fix.submitting}
        />
      </div>
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {en.accounts.errors[state.error]}
        </p>
      ) : null}
      <div className="space-y-1 rounded-2xl border border-border bg-card px-5 py-4">
        <p className="text-base break-words text-muted-foreground">
          {accountName}
        </p>
        <p className="text-sm text-muted-foreground">
          {en.accounts.fix.current}
        </p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {current}
        </p>
      </div>
      <div className="space-y-1 rounded-2xl border border-border bg-card px-5 py-4 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <Label
          htmlFor={`${uid}-amount`}
          className="text-sm font-normal text-muted-foreground"
        >
          {owing ? en.accounts.fix.debtLabel : en.accounts.fix.assetLabel}
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
            autoFocus
            defaultValue={values.amount}
            aria-invalid={Boolean(fieldErrors.amount)}
            aria-describedby={
              fieldErrors.amount ? `${uid}-amount-error` : undefined
            }
            className="h-auto rounded-none border-0 bg-transparent p-0 text-4xl font-semibold tracking-tight text-foreground tabular-nums shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-4xl dark:bg-transparent"
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
          className="h-12 bg-card text-base dark:bg-card"
        />
      </div>
    </form>
  );
}
