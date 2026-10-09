import { en } from "@/messages/en";
import type { AuthErrorKey } from "../domain/types";

export function FieldError({
  id,
  error,
}: {
  id: string;
  error?: AuthErrorKey;
}) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {en.auth.errors[error]}
    </p>
  );
}
