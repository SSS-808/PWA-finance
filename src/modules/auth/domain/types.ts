export const PASSWORD_MIN_LENGTH = 10;

export const AUTH_ERROR_KEYS = [
  "invalid_email",
  "required",
  "password_too_short",
  "passwords_dont_match",
  "invalid_credentials",
  "email_not_confirmed",
  "rate_limited",
  "same_password",
  "unknown",
] as const;

export type AuthErrorKey = (typeof AUTH_ERROR_KEYS)[number];

export type FieldName = "email" | "password" | "confirmPassword";

export type FormState = {
  status: "idle" | "error" | "sent" | "resent";
  error?: AuthErrorKey;
  fieldErrors?: Partial<Record<FieldName, AuthErrorKey>>;
  email?: string;
};

export const idleState: FormState = { status: "idle" };
