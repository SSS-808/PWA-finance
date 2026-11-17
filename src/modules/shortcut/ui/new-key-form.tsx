"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";
import { HelpHint } from "@/components/shared/help-hint";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { currencySymbol, type CurrencyCode } from "@/modules/money";
import {
  MAX_KEY_NAME,
  type NewKeyState,
  type ShortcutKeyErrorKey,
} from "../domain/keys";
import { createShortcutKey } from "../server/key-actions";

const text = en.shortcut.settings;

const idleState: NewKeyState = { status: "idle" };

export type KeyAccountOption = {
  id: string;
  name: string;
  currency: CurrencyCode;
};

function FieldMessage({
  id,
  error,
}: {
  id: string;
  error?: ShortcutKeyErrorKey;
}) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {text.errors[error]}
    </p>
  );
}

// The key, shown once; it lives only in this state and is never stored
function CreatedView({ name, secret }: { name: string; secret: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight break-words">
        {text.created.title.replace("{name}", () => name)}
      </h1>
      <p
        role="note"
        className="inline-block rounded-full bg-cat-amber-soft px-3 py-1 text-sm font-medium text-cat-amber"
      >
        {text.created.shownOnce}
      </p>
      <p className="rounded-2xl border border-border bg-card p-4 font-mono text-sm break-all">
        {secret}
      </p>
      <Button type="button" className="h-12 w-full text-base" onClick={copy}>
        <span aria-live="polite">
          {copied ? text.created.copied : text.created.copy}
        </span>
      </Button>
      <section
        aria-labelledby="shortcut-next"
        className="space-y-2 rounded-2xl border border-border bg-card p-4"
      >
        <h2 id="shortcut-next" className="text-base font-semibold">
          {text.created.nextTitle}
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-base">
          {text.created.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <Button asChild variant="outline" className="h-12 w-full text-base">
        <Link href="/settings/shortcut">{text.created.done}</Link>
      </Button>
    </div>
  );
}

export function NewKeyForm({ accounts }: { accounts: KeyAccountOption[] }) {
  const uid = useId();
  const [state, formAction] = useActionState(createShortcutKey, idleState);

  if (state.status === "created") {
    return <CreatedView name={state.name} secret={state.key} />;
  }
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {text.form.title}
      </h1>
      {state.status === "error" && state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {text.errors[state.error]}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${uid}-name`} className="text-base">
          {text.form.name}
        </Label>
        <Input
          id={`${uid}-name`}
          name="name"
          autoComplete="off"
          maxLength={MAX_KEY_NAME}
          defaultValue={text.form.defaultName}
          aria-invalid={Boolean(fieldErrors?.name)}
          aria-describedby={fieldErrors?.name ? `${uid}-name-error` : undefined}
          className="h-12 bg-card text-base dark:bg-card"
        />
        <FieldMessage id={`${uid}-name-error`} error={fieldErrors?.name} />
      </div>
      <fieldset className="space-y-2">
        <legend className="flex items-center gap-1 text-base font-medium">
          {text.form.addsTo}
          <HelpHint label={text.form.addsTo}>{text.form.addsToHint}</HelpHint>
        </legend>
        <div className="space-y-2">
          {accounts.map((account, index) => (
            <label key={account.id} className="relative block">
              <input
                type="radio"
                name="accountId"
                value={account.id}
                defaultChecked={index === 0}
                className="peer absolute inset-0 size-full cursor-pointer opacity-0"
              />
              <span className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-base peer-checked:border-primary peer-checked:bg-primary-soft peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                <span className="min-w-0 font-medium break-words">
                  {account.name}
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {currencySymbol(account.currency)}{" "}
                  {en.currencies[account.currency].replace(/ \(.*\)$/, "")}
                </span>
              </span>
            </label>
          ))}
        </div>
        <FieldMessage
          id={`${uid}-account-error`}
          error={fieldErrors?.accountId}
        />
      </fieldset>
      <SubmitButton
        label={text.form.submit}
        pendingLabel={text.form.submitting}
      />
    </form>
  );
}
