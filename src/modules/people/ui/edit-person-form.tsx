"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { MAX_DATE, MAX_NAME_LENGTH, MIN_DATE } from "../domain/schemas";
import type { EditFormState, Jar } from "../domain/types";
import { updatePerson } from "../server/actions";
import { FieldMessage, FormError } from "./field-message";

const idleState: EditFormState = { status: "idle" };

// Rename a person and set when each open debt should be paid back
export function EditPersonForm({
  id,
  name,
  jars,
}: {
  id: string;
  name: string;
  jars: readonly Jar[];
}) {
  const uid = useId();
  const [state, formAction] = useActionState(
    updatePerson.bind(null, id),
    idleState,
  );
  const fieldErrors = state.fieldErrors ?? {};
  const values = state.values;

  return (
    <form action={formAction} className="space-y-6">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-background py-2">
        <h1 className="text-3xl font-semibold tracking-tight break-words">
          {en.people.editForm.title.replace("{name}", () => name)}
        </h1>
        <SubmitButton
          shape="pill"
          label={en.people.move.submit}
          pendingLabel={en.people.move.submitting}
        />
      </div>
      <FormError error={state.error} />
      <div className="space-y-2">
        <Label htmlFor={`${uid}-name`} className="text-base">
          {en.people.editForm.name}
        </Label>
        <Input
          id={`${uid}-name`}
          name="name"
          autoComplete="off"
          maxLength={MAX_NAME_LENGTH}
          defaultValue={values?.name ?? name}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? `${uid}-name-error` : undefined}
          className="h-12 bg-card text-base dark:bg-card"
        />
        <FieldMessage id={`${uid}-name-error`} error={fieldErrors.name} />
      </div>
      {jars.map((jar) => {
        const field = `due:${jar.id}` as const;
        return (
          <div key={jar.id} className="space-y-2">
            <Label htmlFor={`${uid}-${jar.id}`} className="text-base">
              {en.people.editForm.dueOn.replace(
                "{currency}",
                en.people.currencyNames[jar.currency],
              )}
            </Label>
            <Input
              id={`${uid}-${jar.id}`}
              name={field}
              type="date"
              min={MIN_DATE}
              max={MAX_DATE}
              defaultValue={values?.[field] ?? jar.dueOn ?? ""}
              aria-invalid={Boolean(fieldErrors[field])}
              aria-describedby={
                fieldErrors[field] ? `${uid}-${jar.id}-error` : undefined
              }
              className="h-12 bg-card text-base dark:bg-card"
            />
            <FieldMessage
              id={`${uid}-${jar.id}-error`}
              error={fieldErrors[field]}
            />
          </div>
        );
      })}
      <Link
        href={`/people/${id}`}
        className="inline-flex min-h-11 items-center text-base font-medium text-primary"
      >
        {en.people.cancel}
      </Link>
    </form>
  );
}
