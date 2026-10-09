import { z } from "zod";
import {
  AUTH_ERROR_KEYS,
  PASSWORD_MIN_LENGTH,
  type AuthErrorKey,
  type FieldName,
} from "./types";

export { PASSWORD_MIN_LENGTH };
export type { AuthErrorKey };

export const emailSchema = z
  .string({ error: "invalid_email" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "invalid_email" }));

const requiredText = z
  .string({ error: "required" })
  .min(1, { error: "required" });

const newPassword = z
  .string({ error: "required" })
  .min(PASSWORD_MIN_LENGTH, { error: "password_too_short" });

export const logInSchema = z.object({
  email: emailSchema,
  password: requiredText,
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: newPassword,
});

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: requiredText,
  })
  .refine((value) => value.password === value.confirmPassword, {
    error: "passwords_dont_match",
    path: ["confirmPassword"],
  });

const FIELD_NAMES: readonly string[] = ["email", "password", "confirmPassword"];

function isAuthErrorKey(value: string): value is AuthErrorKey {
  return (AUTH_ERROR_KEYS as readonly string[]).includes(value);
}

// Keeps the first error per field and turns schema messages into error keys
export function fieldErrorsFrom(
  error: z.ZodError,
): Partial<Record<FieldName, AuthErrorKey>> {
  const result: Partial<Record<FieldName, AuthErrorKey>> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0]);
    if (!FIELD_NAMES.includes(field)) continue;
    const name = field as FieldName;
    if (result[name]) continue;
    result[name] = isAuthErrorKey(issue.message) ? issue.message : "unknown";
  }
  return result;
}
