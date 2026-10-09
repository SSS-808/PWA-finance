"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  label,
  pendingLabel,
  variant = "default",
}: {
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      className="h-12 w-full text-base"
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
