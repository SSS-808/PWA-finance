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
  type Money,
  currencySymbol,
  formatMoney,
  groupAmountInput,
  money,
  toDecimalString,
} from "@/modules/money";
import { rateText } from "../domain/calculations";
import { MAX_DATE, MIN_DATE, parseAmount } from "../domain/schemas";
import type {
  AccountChoice,
  Jar,
  RepayFieldName,
  RepayFormState,
} from "../domain/types";
import { repay } from "../server/actions";
import { FieldMessage, FormError } from "./field-message";

const idleState: RepayFormState = { status: "idle" };

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

const boxClass =
  "space-y-1 rounded-2xl border border-border bg-card px-5 py-4 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50";

const bigInputClass =
  "h-auto rounded-none border-0 bg-transparent p-0 text-4xl font-semibold tracking-tight tabular-nums shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-4xl dark:bg-transparent";

function accountLabel(account: AccountChoice): string {
  return `${account.name} (${currencySymbol(account.currency)})`;
}

// Money paid back on a debt, in one currency or two; the debt stays in its own currency
export function RepayForm({
  personId,
  personName,
  jar,
  accounts,
  today,
}: {
  personId: string;
  personName: string;
  jar: Jar;
  accounts: readonly AccountChoice[];
  today: string;
}) {
  const uid = useId();
  const [state, formAction] = useActionState(
    repay.bind(null, personId, jar.id),
    idleState,
  );
  const owed = jar.balance.minor > 0;
  const left: Money = money(Math.abs(jar.balance.minor), jar.currency);
  const [account, setAccount] = useState(
    (accounts.find((item) => item.currency === jar.currency) ?? accounts[0])
      ?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [accountAmount, setAccountAmount] = useState("");
  const chosen = accounts.find((item) => item.id === account);
  const crossCurrency =
    chosen !== undefined && chosen.currency !== jar.currency;
  const fieldErrors = state.fieldErrors ?? {};
  const currencyName = en.people.currencyNames[jar.currency];

  function error(name: RepayFieldName) {
    return fieldErrors[name];
  }
  function describe(name: RepayFieldName) {
    return error(name) ? `${uid}-${name}-error` : undefined;
  }

  const jarAmount = parseAmount(amount, jar.currency);
  const otherAmount = chosen
    ? parseAmount(accountAmount, chosen.currency)
    : null;
  const rate =
    crossCurrency && jarAmount.ok && otherAmount?.ok
      ? rateText(jarAmount.value, otherAmount.value)
      : null;

  const text = en.people.repay;
  const title = (owed ? text.titleOwed : text.titleOwe).replace(
    "{name}",
    () => personName,
  );
  const line = (owed ? text.owedLine : text.oweLine)
    .replace("{name}", () => personName)
    .replace("{amount}", () => formatMoney(left));

  return (
    <form action={formAction} className="space-y-6">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-background py-2">
        <Link
          href={`/people/${personId}`}
          className="inline-flex min-h-11 items-center text-base font-medium text-primary"
        >
          {en.people.cancel}
        </Link>
        <SubmitButton
          shape="pill"
          label={en.people.move.submit}
          pendingLabel={en.people.move.submitting}
        />
      </div>
      <FormError error={state.error} />
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <h1 className="text-3xl font-semibold tracking-tight break-words">
            {title}
          </h1>
          <HelpHint label={text.hintLabel}>{text.hint}</HelpHint>
        </div>
        <p className="text-base text-muted-foreground">{line}</p>
      </div>
      <section aria-label={currencyName} className={boxClass}>
        <Label htmlFor={`${uid}-amount`} className="sr-only">
          {(owed ? text.amount : text.amountOwe).replace(
            "{currency}",
            currencyName.toLowerCase(),
          )}
        </Label>
        <div className="flex items-baseline gap-2">
          <span
            aria-hidden="true"
            className="text-3xl font-semibold text-muted-foreground"
          >
            {currencySymbol(jar.currency)}
          </span>
          <AmountInput
            id={`${uid}-amount`}
            name="amount"
            autoFocus
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={Boolean(error("amount"))}
            aria-describedby={describe("amount")}
            className={bigInputClass}
          />
        </div>
        <FieldMessage id={`${uid}-amount-error`} error={error("amount")} />
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-11 rounded-full bg-card px-4 text-base"
          onClick={() => setAmount(groupAmountInput(toDecimalString(left)))}
        >
          {text.all.replace("{amount}", () => formatMoney(left))}
        </Button>
      </section>
      <section aria-labelledby={`${uid}-heading`} className="space-y-4">
        <h2
          id={`${uid}-heading`}
          className="px-1 text-sm font-medium text-muted-foreground"
        >
          {owed ? text.gotHeading : text.paidHeading}
        </h2>
        <div className="space-y-2">
          <Label htmlFor={`${uid}-account`} className="text-base">
            {owed ? text.into : text.from}
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
          </select>
          <FieldMessage id={`${uid}-account-error`} error={error("account")} />
        </div>
        {crossCurrency ? (
          <div className={boxClass}>
            <Label
              htmlFor={`${uid}-accountAmount`}
              className="text-sm font-normal text-muted-foreground"
            >
              {text.accountAmount}
            </Label>
            <div className="flex items-baseline gap-2">
              <span
                aria-hidden="true"
                className="text-3xl font-semibold text-muted-foreground"
              >
                {currencySymbol(chosen.currency)}
              </span>
              <AmountInput
                id={`${uid}-accountAmount`}
                name="accountAmount"
                value={accountAmount}
                onChange={(event) => setAccountAmount(event.target.value)}
                aria-invalid={Boolean(error("accountAmount"))}
                aria-describedby={describe("accountAmount")}
                className={bigInputClass}
              />
            </div>
            <FieldMessage
              id={`${uid}-accountAmount-error`}
              error={error("accountAmount")}
            />
            {rate ? (
              <p className="text-sm text-muted-foreground tabular-nums">
                {rate}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor={`${uid}-date`} className="text-base">
            {text.date}
          </Label>
          <Input
            id={`${uid}-date`}
            name="date"
            type="date"
            min={MIN_DATE}
            max={MAX_DATE}
            defaultValue={state.values?.date ?? today}
            aria-invalid={Boolean(error("date"))}
            aria-describedby={describe("date")}
            className="h-12 bg-card text-base dark:bg-card"
          />
          <FieldMessage id={`${uid}-date-error`} error={error("date")} />
        </div>
      </section>
    </form>
  );
}
