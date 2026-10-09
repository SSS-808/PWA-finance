"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { SubmitButton } from "@/components/shared/submit-button";
import { CURRENCY_CODES } from "@/modules/money";
import { MAX_NAME_LENGTH } from "../domain/schemas";
import type { ProfileErrorKey, ProfileFormState } from "../domain/types";
import { updateProfile } from "../server/actions";

const idleState: ProfileFormState = { status: "idle" };

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

function FieldMessage({ id, error }: { id: string; error?: ProfileErrorKey }) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {en.settings.errors[error]}
    </p>
  );
}

export function ProfileForm({
  displayName,
  baseCurrency,
  timeZone,
  timeZones,
}: {
  displayName: string | null;
  baseCurrency: string;
  timeZone: string;
  timeZones: readonly string[];
}) {
  const [state, formAction] = useActionState(updateProfile, idleState);
  const fieldErrors = state.fieldErrors ?? {};
  // Values from the last submit win over the props, so the form reset keeps what was typed or saved
  const current = state.values ?? {
    displayName: displayName ?? "",
    baseCurrency,
    timeZone,
  };

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {en.settings.errors[state.error]}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="profile-name" className="text-base">
          {en.settings.profile.displayName}
        </Label>
        <Input
          id="profile-name"
          name="displayName"
          autoComplete="name"
          maxLength={MAX_NAME_LENGTH}
          defaultValue={current.displayName}
          aria-invalid={Boolean(fieldErrors.displayName)}
          aria-describedby={`profile-name-hint${fieldErrors.displayName ? " profile-name-error" : ""}`}
          className="h-12 text-base"
        />
        <p id="profile-name-hint" className="text-sm text-muted-foreground">
          {en.settings.profile.displayNameHint}
        </p>
        <FieldMessage id="profile-name-error" error={fieldErrors.displayName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-currency" className="text-base">
          {en.settings.profile.baseCurrency}
        </Label>
        <select
          // A new key remounts the select, because React keeps the old default after a form reset
          key={current.baseCurrency}
          id="profile-currency"
          name="baseCurrency"
          defaultValue={current.baseCurrency}
          aria-invalid={Boolean(fieldErrors.baseCurrency)}
          aria-describedby={`profile-currency-hint${fieldErrors.baseCurrency ? " profile-currency-error" : ""}`}
          className={selectClass}
        >
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {en.currencies[code]}
            </option>
          ))}
        </select>
        <p id="profile-currency-hint" className="text-sm text-muted-foreground">
          {en.settings.profile.baseCurrencyHint}
        </p>
        <FieldMessage
          id="profile-currency-error"
          error={fieldErrors.baseCurrency}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-time-zone" className="text-base">
          {en.settings.profile.timeZone}
        </Label>
        <select
          // A new key remounts the select, because React keeps the old default after a form reset
          key={current.timeZone}
          id="profile-time-zone"
          name="timeZone"
          defaultValue={current.timeZone}
          aria-invalid={Boolean(fieldErrors.timeZone)}
          aria-describedby={`profile-time-zone-hint${fieldErrors.timeZone ? " profile-time-zone-error" : ""}`}
          className={selectClass}
        >
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <p
          id="profile-time-zone-hint"
          className="text-sm text-muted-foreground"
        >
          {en.settings.profile.timeZoneHint}
        </p>
        <FieldMessage
          id="profile-time-zone-error"
          error={fieldErrors.timeZone}
        />
      </div>
      <div className="space-y-3">
        <SubmitButton
          label={en.settings.profile.submit}
          pendingLabel={en.settings.profile.submitting}
        />
        <p role="status" className="min-h-5 text-sm text-muted-foreground">
          {state.status === "saved" ? en.settings.profile.saved : null}
        </p>
      </div>
    </form>
  );
}
