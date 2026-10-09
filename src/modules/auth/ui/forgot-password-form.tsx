"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { idleState } from "../domain/types";
import { sendPasswordReset } from "../server/actions";
import { FieldError } from "./field-error";
import { FormAlert } from "./form-alert";
import { SubmitButton } from "./submit-button";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(sendPasswordReset, idleState);
  const fieldErrors = state.fieldErrors ?? {};

  if (state.status === "sent" && state.email) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {en.auth.forgot.sentTitle}
          </h2>
          <p className="text-base text-muted-foreground">
            {en.auth.forgot.sentBody.replace("{email}", state.email)}
          </p>
        </div>
        <Button asChild variant="outline" className="h-12 w-full text-base">
          <Link href="/login">{en.auth.forgot.back}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {state.error ? (
        <FormAlert>{en.auth.errors[state.error]}</FormAlert>
      ) : null}
      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="forgot-email" className="text-base">
            {en.auth.fields.email}
          </Label>
          <Input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? "forgot-email-error" : undefined
            }
            className="h-12 text-base"
          />
          <FieldError id="forgot-email-error" error={fieldErrors.email} />
        </div>
        <SubmitButton
          label={en.auth.forgot.submit}
          pendingLabel={en.auth.forgot.submitting}
        />
      </form>
      <Link
        href="/login"
        className="inline-block py-2 font-medium underline underline-offset-4"
      >
        {en.auth.forgot.back}
      </Link>
    </div>
  );
}
