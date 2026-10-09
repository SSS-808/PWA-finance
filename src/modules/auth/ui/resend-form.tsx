"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { en } from "@/messages/en";
import { idleState } from "../domain/types";
import { resendConfirmation } from "../server/actions";
import { FormAlert } from "./form-alert";

export function ResendForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(resendConfirmation, idleState);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="email" value={email} />
      {state.status === "resent" ? (
        <p role="status" className="text-sm text-muted-foreground">
          {en.auth.signup.resent}
        </p>
      ) : null}
      {state.status === "error" && state.error ? (
        <FormAlert>{en.auth.errors[state.error]}</FormAlert>
      ) : null}
      <SubmitButton
        variant="outline"
        label={en.auth.signup.resend}
        pendingLabel={en.auth.signup.resending}
      />
    </form>
  );
}
