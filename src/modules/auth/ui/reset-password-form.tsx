"use client";

import { useActionState } from "react";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { PASSWORD_MIN_LENGTH, idleState } from "../domain/types";
import { updatePassword } from "../server/actions";
import { FieldError } from "./field-error";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, idleState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div className="space-y-6">
      {state.error ? (
        <FormAlert>{en.auth.errors[state.error]}</FormAlert>
      ) : null}
      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="reset-password" className="text-base">
            {en.auth.fields.newPassword}
          </Label>
          <PasswordInput
            id="reset-password"
            name="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "reset-password-error" : undefined
            }
          />
          <FieldError id="reset-password-error" error={fieldErrors.password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-confirm" className="text-base">
            {en.auth.fields.confirmPassword}
          </Label>
          <PasswordInput
            id="reset-confirm"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={
              fieldErrors.confirmPassword ? "reset-confirm-error" : undefined
            }
          />
          <FieldError
            id="reset-confirm-error"
            error={fieldErrors.confirmPassword}
          />
        </div>
        <SubmitButton
          label={en.auth.reset.submit}
          pendingLabel={en.auth.reset.submitting}
        />
      </form>
    </div>
  );
}
