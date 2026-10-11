"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { AmountInput } from "@/components/shared/amount-input";
import { HelpHint } from "@/components/shared/help-hint";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import {
  CURRENCY_CODES,
  type CurrencyCode,
  currencySymbol,
} from "@/modules/money";
import type { BudgetErrorKey, BudgetFormState } from "../domain/types";
import { saveBudget } from "../server/actions";

type BudgetFormProps =
  | {
      mode: "create";
      categories: { id: string; name: string }[];
      defaultCurrency: CurrencyCode;
    }
  | {
      mode: "edit";
      categoryId: string;
      categoryName: string;
      currency: CurrencyCode;
      amount: string;
    };

const idleState: BudgetFormState = { status: "idle" };

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

function FieldMessage({ id, error }: { id: string; error?: BudgetErrorKey }) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {en.budgets.errors[error]}
    </p>
  );
}

export function BudgetForm(props: BudgetFormProps) {
  const uid = useId();
  const [state, formAction] = useActionState(saveBudget, idleState);
  const fieldErrors = state.fieldErrors ?? {};
  const creating = props.mode === "create";
  // Values from the last submit win over the starting values, so the form reset keeps what was typed
  const current = state.values ?? {
    categoryId: creating ? "" : props.categoryId,
    currency: creating ? props.defaultCurrency : props.currency,
    amount: creating ? "" : props.amount,
  };
  const [currency, setCurrency] = useState<string>(current.currency);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {en.budgets.errors[state.error]}
        </p>
      ) : null}
      {creating ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-category`} className="text-base">
              {en.budgets.form.category}
            </Label>
            <select
              // A new key remounts the select, because React keeps the old default after a form reset
              key={current.categoryId}
              id={`${uid}-category`}
              name="categoryId"
              defaultValue={current.categoryId}
              aria-invalid={Boolean(fieldErrors.categoryId)}
              aria-describedby={
                fieldErrors.categoryId ? `${uid}-category-error` : undefined
              }
              className={selectClass}
            >
              {props.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldMessage
              id={`${uid}-category-error`}
              error={fieldErrors.categoryId}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-currency`} className="text-base">
              {en.budgets.form.currency}
            </Label>
            <select
              // A new key remounts the select, because React keeps the old default after a form reset
              key={current.currency}
              id={`${uid}-currency`}
              name="currency"
              defaultValue={current.currency}
              onChange={(event) => setCurrency(event.target.value)}
              aria-invalid={Boolean(fieldErrors.currency)}
              aria-describedby={
                fieldErrors.currency ? `${uid}-currency-error` : undefined
              }
              className={selectClass}
            >
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {en.currencies[code]}
                </option>
              ))}
            </select>
            <FieldMessage
              id={`${uid}-currency-error`}
              error={fieldErrors.currency}
            />
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="categoryId" value={props.categoryId} />
          <input type="hidden" name="currency" value={props.currency} />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {en.budgets.form.category}
            </p>
            <p className="text-base break-words">{props.categoryName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {en.budgets.form.currency}
            </p>
            <p className="text-base">{en.currencies[props.currency]}</p>
          </div>
        </>
      )}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor={`${uid}-amount`} className="text-base">
            {en.budgets.form.amount}
          </Label>
          <HelpHint label={en.budgets.form.amount}>
            {en.budgets.form.repeatHint}
          </HelpHint>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-base text-muted-foreground">
            {currencySymbol(currency)}
          </span>
          <AmountInput
            id={`${uid}-amount`}
            name="amount"
            defaultValue={current.amount}
            aria-invalid={Boolean(fieldErrors.amount)}
            aria-describedby={
              fieldErrors.amount ? `${uid}-amount-error` : undefined
            }
            className="h-12 text-base"
          />
        </div>
        <FieldMessage id={`${uid}-amount-error`} error={fieldErrors.amount} />
      </div>
      <div className="space-y-3">
        <SubmitButton
          label={en.budgets.form.submit}
          pendingLabel={en.budgets.form.submitting}
        />
        <Button asChild variant="outline" className="h-12 w-full text-base">
          <Link href="/budgets">{en.budgets.form.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
