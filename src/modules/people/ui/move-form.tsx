"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { AmountInput } from "@/components/shared/amount-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { CURRENCY_CODES, currencySymbol } from "@/modules/money";
import {
  MAX_DATE,
  MAX_NAME_LENGTH,
  MAX_NOTE_LENGTH,
  MIN_DATE,
  NEW_PERSON,
  NO_ACCOUNT,
} from "../domain/schemas";
import type {
  AccountChoice,
  MoveFieldName,
  MoveFormState,
  MoveKind,
} from "../domain/types";
import { moveMoney } from "../server/actions";
import { FieldMessage, FormError } from "./field-message";

const idleState: MoveFormState = { status: "idle" };

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

const inputClass = "h-12 bg-card text-base dark:bg-card";

function accountLabel(account: AccountChoice): string {
  return `${account.name} (${currencySymbol(account.currency)})`;
}

const KINDS: readonly { kind: MoveKind; label: string }[] = [
  { kind: "lend", label: en.people.move.lent },
  { kind: "borrow", label: en.people.move.borrowed },
];

// Lend or borrow: one form, switched by the two buttons at the top
export function MoveForm({
  accounts,
  people,
  kind: startKind,
  personId,
  today,
}: {
  accounts: readonly AccountChoice[];
  people: readonly { id: string; name: string }[];
  kind: MoveKind;
  personId?: string;
  today: string;
}) {
  const uid = useId();
  const [state, formAction] = useActionState(moveMoney, idleState);
  const [kind, setKind] = useState<MoveKind>(startKind);
  const [person, setPerson] = useState(() => {
    if (personId && people.some((item) => item.id === personId)) {
      return personId;
    }
    return people.length === 0 ? NEW_PERSON : "";
  });
  const [account, setAccount] = useState(accounts[0]?.id ?? NO_ACCOUNT);
  const [currency, setCurrency] = useState<string>("LAK");
  const fieldErrors = state.fieldErrors ?? {};
  const values = state.values;
  const chosen = accounts.find((item) => item.id === account);
  const shownCurrency = chosen?.currency ?? currency;
  const lend = kind === "lend";

  function error(name: MoveFieldName) {
    return fieldErrors[name];
  }
  function describe(name: MoveFieldName) {
    return error(name) ? `${uid}-${name}-error` : undefined;
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-background py-2">
        <Link
          href={personId ? `/people/${personId}` : "/people"}
          className="inline-flex min-h-11 items-center text-base font-medium text-primary"
        >
          {en.people.cancel}
        </Link>
        <h1 className="sr-only">{en.people.title}</h1>
        <SubmitButton
          shape="pill"
          label={en.people.move.submit}
          pendingLabel={en.people.move.submitting}
        />
      </div>
      <FormError error={state.error} />
      <input type="hidden" name="kind" value={kind} />
      <div
        role="radiogroup"
        aria-label={en.people.move.kindLabel}
        className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1"
      >
        {KINDS.map((item) => (
          <button
            key={item.kind}
            type="button"
            role="radio"
            aria-checked={kind === item.kind}
            className={cn(
              "h-11 rounded-xl text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              kind === item.kind
                ? "bg-card font-semibold text-foreground shadow-sm"
                : "text-foreground",
            )}
            onClick={() => setKind(item.kind)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="space-y-1 rounded-2xl border border-border bg-card px-5 py-4 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <Label
          htmlFor={`${uid}-amount`}
          className="text-sm font-normal text-muted-foreground"
        >
          {en.people.move.amount}
        </Label>
        <div className="flex items-baseline gap-2">
          <span
            aria-hidden="true"
            className="text-3xl font-semibold text-muted-foreground"
          >
            {currencySymbol(shownCurrency)}
          </span>
          <AmountInput
            id={`${uid}-amount`}
            name="amount"
            autoFocus
            aria-invalid={Boolean(error("amount"))}
            aria-describedby={describe("amount")}
            className="h-auto rounded-none border-0 bg-transparent p-0 text-4xl font-semibold tracking-tight tabular-nums shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-4xl dark:bg-transparent"
            defaultValue={values?.amount ?? ""}
          />
        </div>
        <FieldMessage id={`${uid}-amount-error`} error={error("amount")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-person`} className="text-base">
          {lend ? en.people.move.to : en.people.move.from}
        </Label>
        <select
          id={`${uid}-person`}
          name="person"
          value={person}
          onChange={(event) => setPerson(event.target.value)}
          aria-invalid={Boolean(error("person"))}
          aria-describedby={describe("person")}
          className={selectClass}
        >
          {person === "" ? (
            <option value="">{en.people.move.choosePerson}</option>
          ) : null}
          {people.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
          <option value={NEW_PERSON}>{en.people.move.newPerson}</option>
        </select>
        <FieldMessage id={`${uid}-person-error`} error={error("person")} />
      </div>
      {person === NEW_PERSON ? (
        <div className="space-y-2">
          <Label htmlFor={`${uid}-newName`} className="text-base">
            {en.people.move.name}
          </Label>
          <Input
            id={`${uid}-newName`}
            name="newName"
            autoComplete="off"
            maxLength={MAX_NAME_LENGTH}
            defaultValue={values?.newName ?? ""}
            placeholder={en.people.move.namePlaceholder}
            aria-invalid={Boolean(error("newName"))}
            aria-describedby={describe("newName")}
            className={inputClass}
          />
          <FieldMessage id={`${uid}-newName-error`} error={error("newName")} />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${uid}-account`} className="text-base">
          {lend ? en.people.move.accountFrom : en.people.move.accountInto}
        </Label>
        <select
          id={`${uid}-account`}
          name="account"
          value={account}
          onChange={(event) => setAccount(event.target.value)}
          aria-invalid={Boolean(error("account"))}
          aria-describedby={describe("account")}
          className={selectClass}
        >
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {accountLabel(item)}
            </option>
          ))}
          <option value={NO_ACCOUNT}>{en.people.move.noAccount}</option>
        </select>
        <FieldMessage id={`${uid}-account-error`} error={error("account")} />
      </div>
      {account === NO_ACCOUNT ? (
        <div className="space-y-2">
          <Label htmlFor={`${uid}-currency`} className="text-base">
            {en.people.move.currency}
          </Label>
          <select
            id={`${uid}-currency`}
            name="currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            aria-invalid={Boolean(error("currency"))}
            aria-describedby={describe("currency")}
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
            error={error("currency")}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${uid}-date`} className="text-base">
          {en.people.move.date}
        </Label>
        <Input
          id={`${uid}-date`}
          name="date"
          type="date"
          min={MIN_DATE}
          max={MAX_DATE}
          defaultValue={values?.date ?? today}
          aria-invalid={Boolean(error("date"))}
          aria-describedby={describe("date")}
          className={inputClass}
        />
        <FieldMessage id={`${uid}-date-error`} error={error("date")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-dueOn`} className="text-base">
          {en.people.move.dueOn}
        </Label>
        <Input
          id={`${uid}-dueOn`}
          name="dueOn"
          type="date"
          min={MIN_DATE}
          max={MAX_DATE}
          defaultValue={values?.dueOn ?? ""}
          aria-invalid={Boolean(error("dueOn"))}
          aria-describedby={describe("dueOn")}
          className={inputClass}
        />
        <FieldMessage id={`${uid}-dueOn-error`} error={error("dueOn")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-note`} className="text-base">
          {en.people.move.note}
        </Label>
        <Input
          id={`${uid}-note`}
          name="note"
          autoComplete="off"
          maxLength={MAX_NOTE_LENGTH}
          defaultValue={values?.note ?? ""}
          placeholder={en.people.move.optional}
          aria-invalid={Boolean(error("note"))}
          aria-describedby={describe("note")}
          className={inputClass}
        />
        <FieldMessage id={`${uid}-note-error`} error={error("note")} />
      </div>
    </form>
  );
}
