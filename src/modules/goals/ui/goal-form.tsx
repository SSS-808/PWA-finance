"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { AmountInput } from "@/components/shared/amount-input";
import { HelpHint } from "@/components/shared/help-hint";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import {
  CURRENCY_CODES,
  type CurrencyCode,
  currencySymbol,
} from "@/modules/money";
import { MAX_DEADLINE, MAX_NAME_LENGTH, MIN_DEADLINE } from "../domain/schemas";
import type {
  GoalErrorKey,
  GoalFormState,
  GoalFormValues,
} from "../domain/types";
import { createGoal, updateGoal } from "../server/actions";

type GoalFormProps =
  | { mode: "create"; defaultCurrency: CurrencyCode }
  | {
      mode: "edit";
      id: string;
      currency: CurrencyCode;
      name: string;
      target: string;
      deadline: string;
    };

const idleState: GoalFormState = { status: "idle" };

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

function FieldMessage({ id, error }: { id: string; error?: GoalErrorKey }) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {en.goals.errors[error]}
    </p>
  );
}

function startValues(props: GoalFormProps): GoalFormValues {
  if (props.mode === "edit") {
    return {
      name: props.name,
      currency: props.currency,
      target: props.target,
      deadline: props.deadline,
    };
  }
  return {
    name: "",
    currency: props.defaultCurrency,
    target: "",
    deadline: "",
  };
}

export function GoalForm(props: GoalFormProps) {
  const uid = useId();
  const action =
    props.mode === "edit" ? updateGoal.bind(null, props.id) : createGoal;
  const [state, formAction] = useActionState(action, idleState);
  const fieldErrors = state.fieldErrors ?? {};
  // Values from the last submit win over the starting values, so the form reset keeps what was typed
  const current = state.values ?? startValues(props);
  const [currency, setCurrency] = useState(current.currency);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {en.goals.errors[state.error]}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${uid}-name`} className="text-base">
          {en.goals.form.name}
        </Label>
        <Input
          id={`${uid}-name`}
          name="name"
          autoComplete="off"
          maxLength={MAX_NAME_LENGTH}
          defaultValue={current.name}
          placeholder={en.goals.form.namePlaceholder}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? `${uid}-name-error` : undefined}
          className="h-12 text-base"
        />
        <FieldMessage id={`${uid}-name-error`} error={fieldErrors.name} />
      </div>
      <div className="space-y-2">
        {props.mode === "edit" ? (
          <>
            <div className="flex items-center gap-1">
              <p className="text-base font-medium">{en.goals.form.currency}</p>
              <HelpHint label={en.goals.form.currency}>
                {en.goals.form.currencyLocked}
              </HelpHint>
            </div>
            <p className="text-base">{en.currencies[props.currency]}</p>
          </>
        ) : (
          <>
            <Label htmlFor={`${uid}-currency`} className="text-base">
              {en.goals.form.currency}
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
          </>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-target`} className="text-base">
          {en.goals.form.target}
        </Label>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-base text-muted-foreground">
            {currencySymbol(currency)}
          </span>
          <AmountInput
            id={`${uid}-target`}
            name="target"
            defaultValue={current.target}
            aria-invalid={Boolean(fieldErrors.target)}
            aria-describedby={
              fieldErrors.target ? `${uid}-target-error` : undefined
            }
            className="h-12 text-base"
          />
        </div>
        <FieldMessage id={`${uid}-target-error`} error={fieldErrors.target} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-deadline`} className="text-base">
          {en.goals.form.deadline}
        </Label>
        <Input
          id={`${uid}-deadline`}
          name="deadline"
          type="date"
          min={MIN_DEADLINE}
          max={MAX_DEADLINE}
          defaultValue={current.deadline}
          aria-invalid={Boolean(fieldErrors.deadline)}
          aria-describedby={
            fieldErrors.deadline ? `${uid}-deadline-error` : undefined
          }
          className="h-12 text-base"
        />
        <FieldMessage
          id={`${uid}-deadline-error`}
          error={fieldErrors.deadline}
        />
      </div>
      <div className="space-y-3">
        <SubmitButton
          label={en.goals.form.submit}
          pendingLabel={en.goals.form.submitting}
        />
        <Button asChild variant="outline" className="h-12 w-full text-base">
          <Link href={props.mode === "edit" ? `/goals/${props.id}` : "/goals"}>
            {en.goals.form.cancel}
          </Link>
        </Button>
      </div>
    </form>
  );
}
