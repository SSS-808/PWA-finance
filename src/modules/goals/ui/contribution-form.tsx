"use client";

import { useActionState, useId } from "react";
import { AmountInput } from "@/components/shared/amount-input";
import { HelpHint } from "@/components/shared/help-hint";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import {
  type CurrencyCode,
  type Money,
  currencySymbol,
  formatMoney,
} from "@/modules/money";
import type { ContributionFormState } from "../domain/types";
import { addContribution } from "../server/actions";
import { fill } from "./fill";

// free is null for an account that shows no free to spend
export type ContributionAccount = {
  id: string;
  label: string;
  free: Money | null;
};

const idleState: ContributionFormState = { status: "idle" };

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

// One amount box and the account the money sits in, two buttons: the button pressed decides whether money goes in or comes out
export function ContributionForm({
  goalId,
  currency,
  accounts,
  hasUnassigned,
}: {
  goalId: string;
  currency: CurrencyCode;
  accounts: readonly ContributionAccount[];
  // The goal holds money from before accounts existed for goals
  hasUnassigned: boolean;
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
  // "Not in an account" is offered only when it is needed: old money to take out, or no account to choose
  const showNoAccount = hasUnassigned || accounts.length === 0;

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
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor={`${uid}-account`} className="text-base">
            {en.goals.money.from}
          </Label>
          <HelpHint label={en.goals.money.from}>
            {en.goals.money.fromHint}
          </HelpHint>
        </div>
        <select
          id={`${uid}-account`}
          name="account"
          defaultValue={state.values?.account ?? accounts[0]?.id ?? ""}
          className={selectClass}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.free
                ? fill(en.goals.money.option, {
                    account: account.label,
                    free: formatMoney(account.free),
                  })
                : account.label}
            </option>
          ))}
          {showNoAccount ? (
            <option value="">{en.goals.money.noAccount}</option>
          ) : null}
        </select>
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
