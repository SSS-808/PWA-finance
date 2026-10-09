"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  label,
  pendingLabel,
  variant = "default",
  pending,
}: {
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline";
  // For forms that submit by code, where the form status never turns on
  pending?: boolean;
}) {
  const status = useFormStatus();
  const isPending = pending ?? status.pending;
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={isPending}
      className="h-12 w-full text-base"
    >
      {isPending ? pendingLabel : label}
    </Button>
  );
}
