"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { HelpHint } from "@/components/shared/help-hint";
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
  useEffect(() => {
    if (state.status === "saved") toast(en.settings.profile.saved);
  }, [state]);
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
          aria-describedby={
            fieldErrors.displayName ? "profile-name-error" : undefined
          }
          className="h-12 text-base"
        />
        <FieldMessage id="profile-name-error" error={fieldErrors.displayName} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="profile-currency" className="text-base">
            {en.settings.profile.baseCurrency}
          </Label>
          <HelpHint label={en.settings.profile.baseCurrency}>
            {en.settings.profile.baseCurrencyHint}
          </HelpHint>
        </div>
        <select
          // A new key remounts the select, because React keeps the old default after a form reset
          key={current.baseCurrency}
          id="profile-currency"
          name="baseCurrency"
          defaultValue={current.baseCurrency}
          aria-invalid={Boolean(fieldErrors.baseCurrency)}
          aria-describedby={
            fieldErrors.baseCurrency ? "profile-currency-error" : undefined
          }
          className={selectClass}
        >
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {en.currencies[code]}
            </option>
          ))}
        </select>
        <FieldMessage
          id="profile-currency-error"
          error={fieldErrors.baseCurrency}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="profile-time-zone" className="text-base">
            {en.settings.profile.timeZone}
          </Label>
          <HelpHint label={en.settings.profile.timeZone}>
            {en.settings.profile.timeZoneHint}
          </HelpHint>
        </div>
        <select
          // A new key remounts the select, because React keeps the old default after a form reset
          key={current.timeZone}
          id="profile-time-zone"
          name="timeZone"
          defaultValue={current.timeZone}
          aria-invalid={Boolean(fieldErrors.timeZone)}
          aria-describedby={
            fieldErrors.timeZone ? "profile-time-zone-error" : undefined
          }
          className={selectClass}
        >
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        <FieldMessage
          id="profile-time-zone-error"
          error={fieldErrors.timeZone}
        />
      </div>
      <SubmitButton
        label={en.settings.profile.submit}
        pendingLabel={en.settings.profile.submitting}
      />
    </form>
  );
}
