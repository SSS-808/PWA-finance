"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
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

type EntryFormProps = {
  accounts: readonly AccountOption[];
  expenseCategories: readonly CategoryOption[];
  incomeCategories: readonly CategoryOption[];
} & (
  | {
      mode: "create";
      returnTo: string;
      defaultAccountId: string;
      today: string;
    }
  | { mode: "edit"; id: string; initial: EntryFormValues }
);

const idleState: EntryFormState = { status: "idle" };

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

// The symbol shown before the amount, for example $ or ₭
function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? currency;
}

function startValues(props: EntryFormProps): EntryFormValues {
  if (props.mode === "edit") return props.initial;
  return {
    kind: "expense",
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
    // The chips change with the kind, so the old pick no longer exists
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
      {topError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {en.transactions.errors[isErrorKey(topError) ? topError : "unknown"]}
        </p>
      ) : null}
      <input type="hidden" name="kind" value={kind} />
      <div
        role="group"
        aria-label={en.transactions.form.kind}
        className="grid grid-cols-2 gap-2"
      >
        {ENTRY_KINDS.map((value) => (
          <Button
            key={value}
            type="button"
            variant={kind === value ? "default" : "outline"}
            aria-pressed={kind === value}
            className="h-12 text-base"
            onClick={() => chooseKind(value)}
          >
            {en.transactions.kinds[value]}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-amount`} className="text-base">
          {en.transactions.form.amount}
        </Label>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-3xl text-muted-foreground">
            {currency ? currencySymbol(currency) : null}
          </span>
          <Input
            id={`${uid}-amount`}
            inputMode="decimal"
            autoComplete="off"
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
      <fieldset
        aria-describedby={categoryError ? `${uid}-category-error` : undefined}
        className="space-y-2"
      >
        <legend className="mb-2 text-base font-medium">
          {en.transactions.form.category}
        </legend>
        {/* A new key remounts the chips when the kind changes */}
        <div key={kind} className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <label key={category.id} className="relative">
              <input
                type="radio"
                value={category.id}
                className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                defaultChecked={category.id === initial.categoryId}
                {...register("categoryId")}
              />
              <span className="inline-flex min-h-11 items-center rounded-full border border-input bg-background px-4 text-base peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                {category.name}
              </span>
            </label>
          ))}
        </div>
        <FieldMessage id={`${uid}-category-error`} error={categoryError} />
      </fieldset>
      <div className="space-y-2">
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
