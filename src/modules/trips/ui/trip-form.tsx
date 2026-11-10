"use client";

import { useActionState, useId } from "react";
import { HelpHint } from "@/components/shared/help-hint";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { MAX_DATE, MAX_NAME_LENGTH, MIN_DATE } from "../domain/schemas";
import type {
  TripErrorKey,
  TripFormState,
  TripFormValues,
} from "../domain/types";
import { createTrip, updateTrip } from "../server/actions";

type TripFormProps = { title: string } & (
  | { mode: "create"; today: string }
  | { mode: "edit"; id: string; name: string; startsOn: string; endsOn: string }
);

const idleState: TripFormState = { status: "idle" };

function FieldMessage({ id, error }: { id: string; error?: TripErrorKey }) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {en.trips.errors[error]}
    </p>
  );
}

function startValues(props: TripFormProps): TripFormValues {
  if (props.mode === "edit") {
    return {
      name: props.name,
      startsOn: props.startsOn,
      endsOn: props.endsOn,
    };
  }
  return { name: "", startsOn: props.today, endsOn: props.today };
}

export function TripForm(props: TripFormProps) {
  const uid = useId();
  const action =
    props.mode === "edit" ? updateTrip.bind(null, props.id) : createTrip;
  const [state, formAction] = useActionState(action, idleState);
  const fieldErrors = state.fieldErrors ?? {};
  // Values from the last submit win over the starting values, so the form reset keeps what was typed
  const current = state.values ?? startValues(props);

  return (
    <form action={formAction} className="space-y-6">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-background py-2">
        <h1 className="text-3xl font-semibold tracking-tight break-words">
          {props.title}
        </h1>
        <SubmitButton
          shape="pill"
          label={en.trips.form.submit}
          pendingLabel={en.trips.form.submitting}
        />
      </div>
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {en.trips.errors[state.error]}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${uid}-name`} className="text-base">
          {en.trips.form.name}
        </Label>
        <Input
          id={`${uid}-name`}
          name="name"
          autoComplete="off"
          maxLength={MAX_NAME_LENGTH}
          defaultValue={current.name}
          placeholder={en.trips.form.namePlaceholder}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? `${uid}-name-error` : undefined}
          className="h-12 bg-card text-base dark:bg-card"
        />
        <FieldMessage id={`${uid}-name-error`} error={fieldErrors.name} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor={`${uid}-starts`} className="text-base">
              {en.trips.form.startsOn}
            </Label>
            <HelpHint label={en.trips.form.startsOn}>
              {en.trips.form.startsOnHint}
            </HelpHint>
          </div>
          <Input
            id={`${uid}-starts`}
            name="startsOn"
            type="date"
            min={MIN_DATE}
            max={MAX_DATE}
            defaultValue={current.startsOn}
            aria-invalid={Boolean(fieldErrors.startsOn)}
            aria-describedby={
              fieldErrors.startsOn ? `${uid}-starts-error` : undefined
            }
            className="h-12 bg-card text-base dark:bg-card"
          />
          <FieldMessage
            id={`${uid}-starts-error`}
            error={fieldErrors.startsOn}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`${uid}-ends`} className="text-base">
            {en.trips.form.endsOn}
          </Label>
          <Input
            id={`${uid}-ends`}
            name="endsOn"
            type="date"
            min={MIN_DATE}
            max={MAX_DATE}
            defaultValue={current.endsOn}
            aria-invalid={Boolean(fieldErrors.endsOn)}
            aria-describedby={
              fieldErrors.endsOn ? `${uid}-ends-error` : undefined
            }
            className="h-12 bg-card text-base dark:bg-card"
          />
          <FieldMessage id={`${uid}-ends-error`} error={fieldErrors.endsOn} />
        </div>
      </div>
    </form>
  );
}
