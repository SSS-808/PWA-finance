"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { deleteTrip } from "../server/actions";

// Two steps: the quiet button opens the question, and the entries stay in History either way
export function DeleteTripButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full gap-2 text-base text-muted-foreground underline underline-offset-4"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-5" aria-hidden="true" />
        {en.trips.delete}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={en.trips.deleteTitle}
        confirmLabel={pending ? en.trips.deleting : en.trips.deleteYes}
        cancelLabel={en.trips.cancel}
        onConfirm={() => startTransition(() => deleteTrip(id))}
        onCancel={() => setConfirming(false)}
      >
        {en.trips.deleteConfirm}
      </ConfirmDialog>
    </>
  );
}
