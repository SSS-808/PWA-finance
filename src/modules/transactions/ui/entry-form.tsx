"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { AmountInput } from "@/components/shared/amount-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { currencySymbol, groupAmountInput } from "@/modules/money";
import {
  type EntryInput,
  type EntryOutput,
  MAX_DATE,
  MAX_NOTE_LENGTH,
  MIN_DATE,
  entrySchema,
} from "../domain/schemas";
import {
  ENTRY_KINDS,
  TRANSACTION_ERROR_KEYS,
  type AccountOption,
  type CategoryOption,
  type EntryFormState,
  type EntryFormValues,
  type EntryKind,
  type TransactionErrorKey,
} from "../domain/types";
import { createEntry, updateEntry } from "../server/actions";
import { CategoryPicker } from "./category-picker";
import { ADD_KINDS, KindSwitch } from "./kind-switch";

type EntryFormProps = {
  title: string;
  accounts: readonly AccountOption[];
  expenseCategories: readonly CategoryOption[];
  incomeCategories: readonly CategoryOption[];
} & (
  | {
      mode: "create";
      returnTo: string;
      defaultAccountId: string;
      today: string;
      initialKind: EntryKind;
      // The Add page offers Transfer as a third choice, shown by its own form
      onTransfer: () => void;
    }
  | { mode: "edit"; id: string; initial: EntryFormValues }
);

const idleState: EntryFormState = { status: "idle" };

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

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

function startValues(props: EntryFormProps): EntryFormValues {
  if (props.mode === "edit") {
    return { ...props.initial, amount: groupAmountInput(props.initial.amount) };
  }
  return {
    kind: props.initialKind,
    amount: "",
    accountId: props.defaultAccountId,
    categoryId: "",
    date: props.today,
    note: "",
  };
}

export function EntryForm(props: EntryFormProps) {
  const uid = useId();
  // The same values go to the form library and to the server-rendered HTML
  const initial = startValues(props);
  const action =
    props.mode === "edit"
      ? updateEntry.bind(null, props.id)
      : createEntry.bind(null, props.returnTo);
  const [state, formAction, pending] = useActionState(action, idleState);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<EntryInput, unknown, EntryOutput>({
    resolver: zodResolver(entrySchema),
    defaultValues: initial,
  });
  const kind = useWatch({ control, name: "kind" });
  const selectedId = useWatch({ control, name: "categoryId" });
  const accountId = useWatch({ control, name: "accountId" });
  const currency = props.accounts.find((a) => a.id === accountId)?.currency;
  const categories =
    kind === "income" ? props.incomeCategories : props.expenseCategories;

  // The first message wins: the form's own check, then the server's
  function errorFor(name: keyof EntryFormValues): string | undefined {
    return errors[name]?.message ?? state.fieldErrors?.[name];
  }
  const amountError = errorFor("amount");
  const categoryError = errorFor("categoryId");
  const accountError = errorFor("accountId");
  const dateError = errorFor("date");
  const noteError = errorFor("note");
  const topError = state.error ?? state.fieldErrors?.kind;

  function chooseKind(next: EntryKind) {
    if (next === kind) return;
    setValue("kind", next);
    // The categories change with the kind, so the old pick no longer exists
    setValue("categoryId", "");
    clearErrors("categoryId");
  }

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
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-background py-2">
        <h1 className="text-3xl font-semibold tracking-tight">{props.title}</h1>
        <SubmitButton
          shape="pill"
          label={en.transactions.form.submit}
          pendingLabel={en.transactions.form.submitting}
          pending={pending}
        />
      </div>
      {topError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {en.transactions.errors[isErrorKey(topError) ? topError : "unknown"]}
        </p>
      ) : null}
      <input type="hidden" name="kind" value={kind} />
      <KindSwitch
        kinds={props.mode === "create" ? ADD_KINDS : ENTRY_KINDS}
        value={kind}
        onChange={(next) => {
          if (next === "transfer") {
            if (props.mode === "create") props.onTransfer();
          } else {
            chooseKind(next);
          }
        }}
      />
      <div className="space-y-1 rounded-2xl border border-border bg-card px-5 py-4 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <Label
          htmlFor={`${uid}-amount`}
          className="text-sm font-normal text-muted-foreground"
        >
          {en.transactions.form.amount}
        </Label>
        <div className="flex items-baseline gap-2">
          <span
            aria-hidden="true"
            className="text-3xl font-semibold text-muted-foreground"
          >
            {currency ? currencySymbol(currency) : null}
          </span>
          <AmountInput
            id={`${uid}-amount`}
            autoFocus
            aria-invalid={Boolean(amountError)}
            aria-describedby={amountError ? `${uid}-amount-error` : undefined}
            className={cn(
              "h-auto rounded-none border-0 bg-transparent p-0 text-4xl font-semibold tracking-tight tabular-nums shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-4xl dark:bg-transparent",
              kind === "income" ? "text-income" : "text-expense",
            )}
            defaultValue={initial.amount}
            {...register("amount")}
          />
        </div>
        <FieldMessage id={`${uid}-amount-error`} error={amountError} />
      </div>
      <div className="space-y-2">
        {/* A new key remounts the picker when the kind changes */}
        <CategoryPicker
          key={kind}
          categories={categories}
          initialId={initial.categoryId}
          selectedId={selectedId}
          register={register}
          labelId={`${uid}-category-label`}
          errorId={categoryError ? `${uid}-category-error` : undefined}
        />
        <FieldMessage id={`${uid}-category-error`} error={categoryError} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`${uid}-account`} className="text-base">
            {en.transactions.form.account}
          </Label>
          <select
            id={`${uid}-account`}
            aria-invalid={Boolean(accountError)}
            aria-describedby={accountError ? `${uid}-account-error` : undefined}
            className={selectClass}
            defaultValue={initial.accountId}
            {...register("accountId")}
          >
            {props.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <FieldMessage id={`${uid}-account-error`} error={accountError} />
        </div>
        <div className="min-w-0 space-y-2">
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
            className="h-12 bg-card text-base dark:bg-card"
            defaultValue={initial.date}
            {...register("date")}
          />
          <FieldMessage id={`${uid}-date-error`} error={dateError} />
        </div>
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
          className="h-12 bg-card text-base dark:bg-card"
          defaultValue={initial.note}
          {...register("note")}
        />
        <FieldMessage id={`${uid}-note-error`} error={noteError} />
      </div>
    </form>
  );
}
