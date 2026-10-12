"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import {
  CategoryIcon,
  categoryBarClass,
} from "@/components/shared/category-icon";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { MAX_NAME_LENGTH } from "../domain/schemas";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_KINDS,
  type CategoryErrorKey,
  type CategoryFormState,
  type CategoryFormValues,
  type CategoryLook,
} from "../domain/types";
import { createCategory, updateCategory } from "../server/actions";

type CategoryFormProps =
  | { mode: "create" }
  | ({ mode: "edit"; id: string; name: string } & CategoryLook);

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

function startLook(props: CategoryFormProps): CategoryLook {
  return props.mode === "edit"
    ? { icon: props.icon, color: props.color }
    : { icon: "tag", color: "gray" };
}

function startValues(props: CategoryFormProps): CategoryFormValues {
  return {
    name: props.mode === "edit" ? props.name : "",
    kind: CATEGORY_KINDS[0],
    ...startLook(props),
  };
}

export function CategoryForm(props: CategoryFormProps) {
  const uid = useId();
  const editing = props.mode === "edit";
  const action =
    props.mode === "edit"
      ? updateCategory.bind(null, props.id)
      : createCategory;
  const [state, formAction] = useActionState(action, idleState);
  // The icon badges follow the picked colour, so the pick lives in state
  const [look, setLook] = useState<CategoryLook>(() => startLook(props));
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
      <fieldset
        aria-describedby={fieldErrors.icon ? `${uid}-icon-error` : undefined}
      >
        <legend className="mb-2 text-base font-medium">
          {en.categories.form.icon}
        </legend>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {CATEGORY_ICONS.map((key) => (
            <label key={key} className="relative">
              <input
                type="radio"
                name="icon"
                value={key}
                aria-label={en.categories.icons[key]}
                checked={look.icon === key}
                onChange={() => setLook({ ...look, icon: key })}
                className="peer absolute inset-0 size-full cursor-pointer opacity-0"
              />
              <span className="flex h-12 items-center justify-center rounded-xl border-2 border-transparent peer-checked:border-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                <CategoryIcon icon={key} color={look.color} />
              </span>
            </label>
          ))}
        </div>
        <FieldMessage id={`${uid}-icon-error`} error={fieldErrors.icon} />
      </fieldset>
      <fieldset
        aria-describedby={fieldErrors.color ? `${uid}-color-error` : undefined}
      >
        <legend className="mb-2 text-base font-medium">
          {en.categories.form.color}
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((key) => (
            <label key={key} className="relative">
              <input
                type="radio"
                name="color"
                value={key}
                aria-label={en.categories.colors[key]}
                checked={look.color === key}
                onChange={() => setLook({ ...look, color: key })}
                className="peer absolute inset-0 size-full cursor-pointer opacity-0"
              />
              <span className="flex size-12 items-center justify-center rounded-full border-2 border-transparent peer-checked:border-primary peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50">
                <span
                  className={cn(
                    "block size-8 rounded-full",
                    categoryBarClass(key),
                  )}
                />
              </span>
            </label>
          ))}
        </div>
        <FieldMessage id={`${uid}-color-error`} error={fieldErrors.color} />
      </fieldset>
      {editing ? null : (
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
            editing
              ? en.categories.form.submitEdit
              : en.categories.form.submitNew
          }
          pendingLabel={
            editing
              ? en.categories.form.submittingEdit
              : en.categories.form.submittingNew
          }
        />
        {editing ? (
          <Button asChild variant="outline" className="h-12 w-full text-base">
            <Link href="/settings/categories">{en.categories.form.cancel}</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
