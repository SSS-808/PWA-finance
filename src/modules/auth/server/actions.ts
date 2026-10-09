"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "../domain/redirect";
import {
  emailSchema,
  fieldErrorsFrom,
  logInSchema,
  resetPasswordSchema,
  signUpSchema,
} from "../domain/schemas";
import type { AuthErrorKey, FormState } from "../domain/types";
import { requireUser } from "./session";

type AuthFailure = { status?: number; code?: string; message: string };

function mapAuthError(error: AuthFailure): AuthErrorKey {
  const isRateLimit =
    error.status === 429 || /^over_.+_rate_limit$/.test(error.code ?? "");
  if (isRateLimit) return "rate_limited";
  if (error.code === "invalid_credentials") return "invalid_credentials";
  if (error.code === "email_not_confirmed") return "email_not_confirmed";
  if (error.code === "same_password") return "same_password";
  console.error("Unexpected auth error", {
    status: error.status,
    code: error.code,
    message: error.message,
  });
  return "unknown";
}

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function logIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = textField(formData, "email");
  const parsed = logInSchema.safeParse({
    email,
    password: textField(formData, "password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      email,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", error: mapAuthError(error), email };

  redirect(safeNextPath(textField(formData, "next")));
}

export async function signUp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = textField(formData, "email");
  const parsed = signUpSchema.safeParse({
    email,
    password: textField(formData, "password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      email,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(parsed.data);
  if (error) return { status: "error", error: mapAuthError(error), email };

  return { status: "sent", email: parsed.data.email };
}

export async function resendConfirmation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = textField(formData, "email");
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success)
    return { status: "error", error: "invalid_email", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
  });
  if (error) return { status: "error", error: mapAuthError(error), email };

  return { status: "resent", email: parsed.data };
}

export async function sendPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = textField(formData, "email");
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: { email: "invalid_email" },
      email,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data);
  if (error) {
    const key = mapAuthError(error);
    if (key === "rate_limited") return { status: "error", error: key, email };
  }

  // Same answer whether or not an account exists
  return { status: "sent", email: parsed.data };
}

export async function updatePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = resetPasswordSchema.safeParse({
    password: textField(formData, "password"),
    confirmPassword: textField(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { status: "error", error: mapAuthError(error) };

  redirect("/?notice=password-updated");
}

export async function logOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
