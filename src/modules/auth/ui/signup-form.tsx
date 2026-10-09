"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { PASSWORD_MIN_LENGTH, idleState } from "../domain/types";
import { signUp } from "../server/actions";
import { FieldError } from "./field-error";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";
import { ResendForm } from "./resend-form";
import { SubmitButton } from "./submit-button";

const linkClass = "inline-block py-2 font-medium underline underline-offset-4";

export function SignupForm() {
  const [state, formAction] = useActionState(signUp, idleState);
  const fieldErrors = state.fieldErrors ?? {};

  if (state.status === "sent" && state.email) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {en.auth.signup.sentTitle}
          </h2>
          <p className="text-base text-muted-foreground">
            {en.auth.signup.sentBody.replace("{email}", state.email)}
          </p>
        </div>
        <ResendForm email={state.email} />
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
          <Label htmlFor="signup-email" className="text-base">
            {en.auth.fields.email}
          </Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? "signup-email-error" : undefined
            }
            className="h-12 text-base"
          />
          <FieldError id="signup-email-error" error={fieldErrors.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password" className="text-base">
            {en.auth.fields.password}
          </Label>
          <PasswordInput
            id="signup-password"
            name="password"
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "signup-password-error" : undefined
            }
          />
          <FieldError id="signup-password-error" error={fieldErrors.password} />
        </div>
        <SubmitButton
          label={en.auth.signup.submit}
          pendingLabel={en.auth.signup.submitting}
        />
      </form>
      <p className="text-base text-muted-foreground">
        {en.auth.signup.haveAccount}{" "}
        <Link href="/login" className={`${linkClass} text-foreground`}>
          {en.auth.signup.loginLink}
        </Link>
      </p>
    </div>
  );
}
