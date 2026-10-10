"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { MAX_NAME_LENGTH } from "../domain/schemas";
import {
  CATEGORY_KINDS,
  type CategoryErrorKey,
  type CategoryFormState,
  type CategoryFormValues,
} from "../domain/types";
import { createCategory, renameCategory } from "../server/actions";

type CategoryFormProps =
  { mode: "create" } | { mode: "rename"; id: string; name: string };

const idleState: CategoryFormState = { status: "idle" };

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

function FieldMessage({ id, error }: { id: string; error?: CategoryErrorKey }) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {en.categories.errors[error]}
    </p>
  );
}

function startValues(props: CategoryFormProps): CategoryFormValues {
  return {
    name: props.mode === "rename" ? props.name : "",
    kind: CATEGORY_KINDS[0],
  };
}

export function CategoryForm(props: CategoryFormProps) {
  const uid = useId();
  const renaming = props.mode === "rename";
  const action =
    props.mode === "rename"
      ? renameCategory.bind(null, props.id)
      : createCategory;
  const [state, formAction] = useActionState(action, idleState);
  const fieldErrors = state.fieldErrors ?? {};
  // Values from the last submit win over the starting values, so the form reset keeps what was typed
  const current = state.values ?? startValues(props);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {en.categories.errors[state.error]}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${uid}-name`} className="text-base">
          {en.categories.form.name}
        </Label>
        <Input
          id={`${uid}-name`}
          name="name"
          autoComplete="off"
          maxLength={MAX_NAME_LENGTH}
          defaultValue={current.name}
          aria-invalid={Boolean(fieldErrors.name)}
          placeholder={en.categories.form.namePlaceholder}
          aria-describedby={fieldErrors.name ? `${uid}-name-error` : undefined}
          className="h-12 text-base"
        />
        <FieldMessage id={`${uid}-name-error`} error={fieldErrors.name} />
      </div>
      {renaming ? null : (
        <div className="space-y-2">
          <Label htmlFor={`${uid}-kind`} className="text-base">
            {en.categories.form.kind}
          </Label>
          <select
            // A new key remounts the select, because React keeps the old default after a form reset
            key={current.kind}
            id={`${uid}-kind`}
            name="kind"
            defaultValue={current.kind}
            aria-invalid={Boolean(fieldErrors.kind)}
            aria-describedby={
              fieldErrors.kind ? `${uid}-kind-error` : undefined
            }
            className={selectClass}
          >
            {CATEGORY_KINDS.map((value) => (
              <option key={value} value={value}>
                {en.categories.kinds[value]}
              </option>
            ))}
          </select>
          <FieldMessage id={`${uid}-kind-error`} error={fieldErrors.kind} />
        </div>
      )}
      <div className="space-y-3">
        <SubmitButton
          label={
            renaming
              ? en.categories.form.submitEdit
              : en.categories.form.submitNew
          }
          pendingLabel={
            renaming
              ? en.categories.form.submittingEdit
              : en.categories.form.submittingNew
          }
        />
        {renaming ? (
          <Button asChild variant="outline" className="h-12 w-full text-base">
            <Link href="/settings/categories">{en.categories.form.cancel}</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
