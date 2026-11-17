"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { deleteShortcutKey } from "../server/key-actions";

const text = en.shortcut.settings.delete;

// Two steps: the icon opens the question, and the entries the key added stay either way
export function DeleteKeyButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="size-11 shrink-0 text-muted-foreground"
        aria-label={text.label.replace("{name}", () => name)}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-5" aria-hidden="true" />
      </Button>
      <ConfirmDialog
        open={confirming}
        title={text.title.replace("{name}", () => name)}
        confirmLabel={pending ? text.deleting : text.confirm}
        cancelLabel={text.cancel}
        onConfirm={() => startTransition(() => deleteShortcutKey(id))}
        onCancel={() => setConfirming(false)}
      >
        {text.body}
      </ConfirmDialog>
    </>
  );
}
