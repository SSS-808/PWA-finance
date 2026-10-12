"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  label,
  pendingLabel,
  variant = "default",
  shape = "full",
  pending,
}: {
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline";
  // Full is the wide bottom button; pill is the compact one for a header row
  shape?: "full" | "pill";
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
      className={
        shape === "pill"
          ? "h-11 rounded-full px-5 text-base"
          : "h-12 w-full text-base"
      }
    >
      {isPending ? pendingLabel : label}
    </Button>
  );
}
