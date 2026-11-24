"use client";

import { Archive } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { archivePerson } from "../server/actions";

// Two steps: the quiet button opens the question; History keeps the person's name
export function ArchivePersonButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const text = en.people.editForm;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full gap-2 text-base text-muted-foreground underline underline-offset-4"
        onClick={() => setConfirming(true)}
      >
        <Archive className="size-5" aria-hidden="true" />
        {text.archive}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={text.archiveTitle.replace("{name}", () => name)}
        confirmLabel={pending ? text.archiving : text.archiveYes}
        cancelLabel={en.people.cancel}
        onConfirm={() => startTransition(() => archivePerson(id))}
        onCancel={() => setConfirming(false)}
      >
        {text.archiveBody}
      </ConfirmDialog>
    </>
  );
}
