import { en } from "@/messages/en";
import type { PeopleErrorKey } from "../domain/types";

// The red line under a field
export function FieldMessage({
  id,
  error,
}: {
  id: string;
  error?: PeopleErrorKey;
}) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {en.people.errors[error]}
    </p>
  );
}

// The red box at the top of a form
export function FormError({ error }: { error?: PeopleErrorKey }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {en.people.errors[error]}
    </p>
  );
}
