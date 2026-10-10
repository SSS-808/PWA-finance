"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { startTransition, useActionState, useId } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { AmountInput } from "@/components/shared/amount-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { currencySymbol, groupAmountInput } from "@/modules/money";
import { MAX_DATE, MAX_NOTE_LENGTH, MIN_DATE } from "../domain/schemas";
import {
  type TransferInput,
  type TransferOutput,
  transferSchemaFor,
} from "../domain/transfer-schema";
import {
  TRANSACTION_ERROR_KEYS,
  type AccountOption,
  type EntryKind,
  type TransactionErrorKey,
  type TransferFieldName,
  type TransferFormState,
  type TransferFormValues,
} from "../domain/types";
import { createTransfer, updateTransfer } from "../server/transfer-actions";
import { ADD_KINDS, KindSwitch } from "./kind-switch";

type TransferFormProps = {
  accounts: readonly AccountOption[];
} & (
  | {
      mode: "create";
      returnTo: string;
      defaultAccountId: string;
      today: string;
      // Expense and Income share the switch with Transfer, but have their own form
      onChooseEntry: (kind: EntryKind) => void;
    }
  | { mode: "edit"; transferId: string; initial: TransferFormValues }
);

const idleState: TransferFormState = { status: "idle" };

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

function isErrorKey(value: string | undefined): value is TransactionErrorKey {
  return (TRANSACTION_ERROR_KEYS as readonly string[]).includes(value ?? "");
}

function FieldMessage({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  const key = isErrorKey(error) ? error : "unknown";
  return (
    <p id={id} className="text-sm text-destructive">
      {en.transactions.errors[key]}
    </p>
  );
}

// Only two accounts with different currencies need a second amount
function differentCurrencies(
  accounts: readonly AccountOption[],
  fromId: string,
  toId: string,
): boolean {
  const from = accounts.find((account) => account.id === fromId)?.currency;
  const to = accounts.find((account) => account.id === toId)?.currency;
  return from !== undefined && to !== undefined && from !== to;
}

function startValues(props: TransferFormProps): TransferFormValues {
  if (props.mode === "edit") {
    return {
      ...props.initial,
      amount: groupAmountInput(props.initial.amount),
      arrived: groupAmountInput(props.initial.arrived),
    };
  }
  return {
    fromAccountId: props.defaultAccountId,
    toAccountId: "",
    amount: "",
    arrived: "",
    date: props.today,
    note: "",
  };
}

function NeedTwoAccounts() {
  return (
    <div className="space-y-4 rounded-lg border border-border px-4 py-6">
      <p className="text-base">{en.transactions.transfer.needTwo}</p>
      <Button asChild className="h-12 w-full text-base">
        <Link href="/accounts/new">{en.transactions.transfer.addAccount}</Link>
      </Button>
    </div>
  );
}

function TransferFields(props: TransferFormProps) {
  const uid = useId();
  // The same values go to the form library and to the server-rendered HTML
  const initial = startValues(props);
  const action =
    props.mode === "edit"
      ? updateTransfer.bind(null, props.transferId)
      : createTransfer.bind(null, props.returnTo);
  const [state, formAction, pending] = useActionState(action, idleState);
  const { accounts } = props;

  // The arrived amount is only required while the two currencies differ, which depends on the values
  const resolver: Resolver<TransferInput, unknown, TransferOutput> = (
    values,
    context,
    options,
  ) =>
    zodResolver(
      transferSchemaFor(
        differentCurrencies(accounts, values.fromAccountId, values.toAccountId),
      ),
    )(values, context, options);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TransferInput, unknown, TransferOutput>({
    resolver,
    defaultValues: initial,
  });
  const fromId = useWatch({ control, name: "fromAccountId" });
  const toId = useWatch({ control, name: "toAccountId" });
  const fromCurrency = accounts.find((a) => a.id === fromId)?.currency;
  const toCurrency = accounts.find((a) => a.id === toId)?.currency;
  const showArrived = differentCurrencies(accounts, fromId, toId);

  // The first message wins: the form's own check, then the server's
  function errorFor(name: TransferFieldName): string | undefined {
    return errors[name]?.message ?? state.fieldErrors?.[name];
  }
  const fromError = errorFor("fromAccountId");
  const toError = errorFor("toAccountId");
  const amountError = errorFor("amount");
  const arrivedError = errorFor("arrived");
  const dateError = errorFor("date");
  const noteError = errorFor("note");

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={handleSubmit((_values, event) => {
        const form = event?.target;
        if (!(form instanceof HTMLFormElement)) return;
        const data = new FormData(form);
        startTransition(() => formAction(data));
      })}
      className="space-y-6"
    >
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {
            en.transactions.errors[
              isErrorKey(state.error) ? state.error : "unknown"
            ]
          }
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${uid}-from`} className="text-base">
          {en.transactions.transfer.from}
        </Label>
        <select
          id={`${uid}-from`}
          aria-invalid={Boolean(fromError)}
          aria-describedby={fromError ? `${uid}-from-error` : undefined}
          className={selectClass}
          defaultValue={initial.fromAccountId}
          {...register("fromAccountId")}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <FieldMessage id={`${uid}-from-error`} error={fromError} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-to`} className="text-base">
          {en.transactions.transfer.to}
        </Label>
        <select
          id={`${uid}-to`}
          aria-invalid={Boolean(toError)}
          aria-describedby={toError ? `${uid}-to-error` : undefined}
          className={selectClass}
          defaultValue={initial.toAccountId}
          {...register("toAccountId")}
        >
          <option value="">{en.transactions.transfer.choose}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <FieldMessage id={`${uid}-to-error`} error={toError} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-amount`} className="text-base">
          {en.transactions.transfer.amount}
        </Label>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-3xl text-muted-foreground">
            {fromCurrency ? currencySymbol(fromCurrency) : null}
          </span>
          <AmountInput
            id={`${uid}-amount`}
            autoFocus
            aria-invalid={Boolean(amountError)}
            aria-describedby={amountError ? `${uid}-amount-error` : undefined}
            className="h-16 text-3xl font-semibold tabular-nums md:text-3xl"
            defaultValue={initial.amount}
            {...register("amount")}
          />
        </div>
        <FieldMessage id={`${uid}-amount-error`} error={amountError} />
      </div>
      {showArrived ? (
        <div className="space-y-2">
          <Label htmlFor={`${uid}-arrived`} className="text-base">
            {en.transactions.transfer.arrived}
          </Label>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-3xl text-muted-foreground">
              {toCurrency ? currencySymbol(toCurrency) : null}
            </span>
            <AmountInput
              id={`${uid}-arrived`}
              aria-invalid={Boolean(arrivedError)}
              aria-describedby={
                arrivedError ? `${uid}-arrived-error` : undefined
              }
              className="h-16 text-3xl font-semibold tabular-nums md:text-3xl"
              defaultValue={initial.arrived}
              {...register("arrived")}
            />
          </div>
          <FieldMessage id={`${uid}-arrived-error`} error={arrivedError} />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${uid}-date`} className="text-base">
          {en.transactions.form.date}
        </Label>
        <Input
          id={`${uid}-date`}
          type="date"
          min={MIN_DATE}
          max={MAX_DATE}
          aria-invalid={Boolean(dateError)}
          aria-describedby={dateError ? `${uid}-date-error` : undefined}
          className="h-12 text-base"
          defaultValue={initial.date}
          {...register("date")}
        />
        <FieldMessage id={`${uid}-date-error`} error={dateError} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-note`} className="text-base">
          {en.transactions.form.note}
        </Label>
        <Input
          id={`${uid}-note`}
          autoComplete="off"
          maxLength={MAX_NOTE_LENGTH}
          aria-invalid={Boolean(noteError)}
          aria-describedby={noteError ? `${uid}-note-error` : undefined}
          className="h-12 text-base"
          defaultValue={initial.note}
          {...register("note")}
        />
        <FieldMessage id={`${uid}-note-error`} error={noteError} />
      </div>
      <SubmitButton
        label={en.transactions.form.submit}
        pendingLabel={en.transactions.form.submitting}
        pending={pending}
      />
    </form>
  );
}

export function TransferForm(props: TransferFormProps) {
  return (
    <div className="space-y-6">
      {props.mode === "create" ? (
        <KindSwitch
          kinds={ADD_KINDS}
          value="transfer"
          onChange={(next) => {
            if (next !== "transfer") props.onChooseEntry(next);
          }}
        />
      ) : null}
      {props.accounts.length < 2 ? (
        <NeedTwoAccounts />
      ) : (
        <TransferFields {...props} />
      )}
    </div>
  );
}
