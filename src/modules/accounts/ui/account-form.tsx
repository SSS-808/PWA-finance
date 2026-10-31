"use client";

import { useActionState, useId, useState } from "react";
import { AmountInput } from "@/components/shared/amount-input";
import { HelpHint } from "@/components/shared/help-hint";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import {
  CURRENCY_CODES,
  type CurrencyCode,
  currencySymbol,
  isCurrencyCode,
  toDecimalString,
} from "@/modules/money";
import {
  ACCOUNT_TYPES,
  type AccountType,
  isAccountType,
  isDebt,
} from "../domain/account-types";
import { defaultMinimum } from "../domain/calculations";
import { MAX_NAME_LENGTH } from "../domain/schemas";
import type {
  AccountErrorKey,
  AccountFormState,
  AccountFormValues,
} from "../domain/types";
import { createAccount, updateAccount } from "../server/actions";

type AccountFormProps = { title: string } & (
  | {
      mode: "create";
      name?: string;
      type?: AccountType;
      currency?: CurrencyCode;
    }
  | {
      mode: "edit";
      id: string;
      currency: CurrencyCode;
      name: string;
      type: AccountType;
      startingAmount: string;
      minimum: string;
    }
);

const idleState: AccountFormState = { status: "idle" };

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

function FieldMessage({ id, error }: { id: string; error?: AccountErrorKey }) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {en.accounts.errors[error]}
    </p>
  );
}

// The minimum a new account starts with, as typed in the box
function defaultMinimumText(type: string, currency: string): string {
  if (!isAccountType(type) || !isCurrencyCode(currency)) return "";
  return toDecimalString(defaultMinimum(type, currency));
}

function startValues(props: AccountFormProps): AccountFormValues {
  if (props.mode === "edit") {
    return {
      name: props.name,
      type: props.type,
      currency: props.currency,
      startingAmount: props.startingAmount,
      minimum: props.minimum,
    };
  }
  const type = props.type ?? ACCOUNT_TYPES[0];
  const currency = props.currency ?? CURRENCY_CODES[0];
  return {
    name: props.name ?? "",
    type,
    currency,
    startingAmount: "",
    minimum: defaultMinimumText(type, currency),
  };
}

export function AccountForm(props: AccountFormProps) {
  const uid = useId();
  const action =
    props.mode === "edit" ? updateAccount.bind(null, props.id) : createAccount;
  const [state, formAction] = useActionState(action, idleState);
  const fieldErrors = state.fieldErrors ?? {};
  // Values from the last submit win over the starting values, so the form reset keeps what was typed
  const current = state.values ?? startValues(props);
  const [type, setType] = useState(current.type);
  const [currency, setCurrency] = useState(current.currency);
  const owing = isAccountType(type) && isDebt(type);
  // A new account follows the default minimum of its type and currency until the person types their own
  const [minimumTyped, setMinimumTyped] = useState(false);
  const [minimumKey, setMinimumKey] = useState(0);
  const minimumStart =
    props.mode === "create" && !minimumTyped
      ? defaultMinimumText(type, currency)
      : current.minimum;

  function followDefault() {
    // A new key remounts the box, because React keeps the old default after the value changed
    if (!minimumTyped) setMinimumKey((key) => key + 1);
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-background py-2">
        <h1 className="text-3xl font-semibold tracking-tight break-words">
          {props.title}
        </h1>
        <SubmitButton
          shape="pill"
          label={en.accounts.form.save}
          pendingLabel={en.accounts.form.saving}
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
      <div className="space-y-2">
        <Label htmlFor={`${uid}-name`} className="text-base">
          {en.accounts.form.name}
        </Label>
        <Input
          id={`${uid}-name`}
          name="name"
          autoComplete="off"
          maxLength={MAX_NAME_LENGTH}
          defaultValue={current.name}
          aria-invalid={Boolean(fieldErrors.name)}
          placeholder={en.accounts.form.namePlaceholder}
          aria-describedby={fieldErrors.name ? `${uid}-name-error` : undefined}
          className="h-12 bg-card text-base dark:bg-card"
        />
        <FieldMessage id={`${uid}-name-error`} error={fieldErrors.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-type`} className="text-base">
          {en.accounts.form.type}
        </Label>
        <select
          // A new key remounts the select, because React keeps the old default after a form reset
          key={current.type}
          id={`${uid}-type`}
          name="type"
          defaultValue={current.type}
          onChange={(event) => {
            setType(event.target.value);
            followDefault();
          }}
          aria-invalid={Boolean(fieldErrors.type)}
          aria-describedby={fieldErrors.type ? `${uid}-type-error` : undefined}
          className={selectClass}
        >
          {ACCOUNT_TYPES.map((value) => (
            <option key={value} value={value}>
              {en.accounts.types[value]}
            </option>
          ))}
        </select>
        <FieldMessage id={`${uid}-type-error`} error={fieldErrors.type} />
      </div>
      <div className="space-y-2">
        {props.mode === "edit" ? (
          <>
            <div className="flex items-center gap-1">
              <p className="text-base font-medium">
                {en.accounts.form.currency}
              </p>
              <HelpHint label={en.accounts.form.currency}>
                {en.accounts.form.currencyLocked}
              </HelpHint>
            </div>
            <p className="text-base">{en.currencies[props.currency]}</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <Label htmlFor={`${uid}-currency`} className="text-base">
                {en.accounts.form.currency}
              </Label>
              <HelpHint label={en.accounts.form.currency}>
                {en.accounts.form.currencyHint}
              </HelpHint>
            </div>
            <select
              // A new key remounts the select, because React keeps the old default after a form reset
              key={current.currency}
              id={`${uid}-currency`}
              name="currency"
              defaultValue={current.currency}
              onChange={(event) => {
                setCurrency(event.target.value);
                followDefault();
              }}
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
        <Label htmlFor={`${uid}-amount`} className="text-base">
          {owing
            ? en.accounts.form.startingOwed
            : en.accounts.form.startingAmount}
        </Label>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-base text-muted-foreground">
            {currencySymbol(currency)}
          </span>
          <AmountInput
            id={`${uid}-amount`}
            name="startingAmount"
            defaultValue={current.startingAmount}
            aria-invalid={Boolean(fieldErrors.startingAmount)}
            placeholder={en.accounts.form.startingPlaceholder}
            aria-describedby={
              fieldErrors.startingAmount ? `${uid}-amount-error` : undefined
            }
            className="h-12 bg-card text-base dark:bg-card"
          />
        </div>
        <FieldMessage
          id={`${uid}-amount-error`}
          error={fieldErrors.startingAmount}
        />
      </div>
      <div hidden={owing} className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor={`${uid}-minimum`} className="text-base">
            {en.accounts.form.minimum}
          </Label>
          <HelpHint label={en.accounts.form.minimum}>
            {en.accounts.form.minimumHint}
          </HelpHint>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-base text-muted-foreground">
            {currencySymbol(currency)}
          </span>
          <AmountInput
            key={minimumKey}
            id={`${uid}-minimum`}
            name="minimum"
            defaultValue={minimumStart}
            onChange={() => setMinimumTyped(true)}
            aria-invalid={Boolean(fieldErrors.minimum)}
            aria-describedby={
              fieldErrors.minimum ? `${uid}-minimum-error` : undefined
            }
            className="h-12 bg-card text-base dark:bg-card"
          />
        </div>
        <FieldMessage id={`${uid}-minimum-error`} error={fieldErrors.minimum} />
      </div>
    </form>
  );
}
