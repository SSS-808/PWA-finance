"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { en } from "@/messages/en";
import { idleState } from "../domain/types";
import { logIn } from "../server/actions";
import { FieldError } from "./field-error";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";
import { ResendForm } from "./resend-form";

const linkClass = "inline-block py-2 font-medium underline underline-offset-4";

export function LoginForm({
  next,
  linkError = false,
}: {
  next?: string;
  linkError?: boolean;
}) {
  const [state, formAction] = useActionState(logIn, idleState);
  const fieldErrors = state.fieldErrors ?? {};
  const unconfirmed = state.error === "email_not_confirmed" && state.email;

  return (
    <div className="space-y-6">
      {linkError && state.status === "idle" ? (
        <FormAlert>{en.auth.errors.link}</FormAlert>
      ) : null}
      {state.error ? (
        <FormAlert>{en.auth.errors[state.error]}</FormAlert>
      ) : null}
      <form action={formAction} className="space-y-6">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-base">
            {en.auth.fields.email}
          </Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? "login-email-error" : undefined
            }
            className="h-12 text-base"
          />
          <FieldError id="login-email-error" error={fieldErrors.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-base">
            {en.auth.fields.password}
          </Label>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "login-password-error" : undefined
            }
          />
          <FieldError id="login-password-error" error={fieldErrors.password} />
        </div>
        <SubmitButton
          label={en.auth.login.submit}
          pendingLabel={en.auth.login.submitting}
        />
      </form>
      {unconfirmed ? <ResendForm email={state.email ?? ""} /> : null}
      <div className="flex flex-col">
        <Link href="/forgot-password" className={linkClass}>
          {en.auth.login.forgot}
        </Link>
        <p className="py-2 text-base text-muted-foreground">
          {en.auth.login.noAccount}{" "}
          <Link href="/signup" className={`${linkClass} text-foreground`}>
            {en.auth.login.signupLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
