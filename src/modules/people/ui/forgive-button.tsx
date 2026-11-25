"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { forgiveJar } from "../server/actions";

// Two steps: the quiet button opens the question; text holds the already-formatted words
export function ForgiveButton({
  personId,
  jarId,
  title,
  body,
  confirmLabel,
}: {
  personId: string;
  jarId: string;
  title: string;
  body: string;
  confirmLabel: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11 rounded-full px-2 text-sm min-[360px]:text-base"
        onClick={() => setConfirming(true)}
      >
        {en.people.forgive}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={title}
        confirmLabel={
          pending ? en.people.forgiveDialog.forgiving : confirmLabel
        }
        cancelLabel={en.people.forgiveDialog.keep}
        onConfirm={() => startTransition(() => forgiveJar(personId, jarId))}
        onCancel={() => setConfirming(false)}
      >
        {body}
      </ConfirmDialog>
    </>
  );
}
