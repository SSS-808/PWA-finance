"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { deletePersonEntry } from "../server/actions";

// An icon-only trash button that asks first; transferId is "" for an entry that is not a transfer
export function DeleteEntryButton({
  personId,
  entryId,
  transferId,
}: {
  personId: string;
  entryId: string;
  transferId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 text-muted-foreground"
        aria-label={en.people.deleteEntry}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-5" aria-hidden="true" />
      </Button>
      <ConfirmDialog
        open={confirming}
        title={en.people.deleteTitle}
        confirmLabel={pending ? en.people.deleting : en.people.deleteYes}
        cancelLabel={en.people.cancel}
        onConfirm={() =>
          startTransition(() =>
            deletePersonEntry(personId, entryId, transferId),
          )
        }
        onCancel={() => setConfirming(false)}
      >
        {en.people.deleteConfirm}
      </ConfirmDialog>
    </>
  );
}
