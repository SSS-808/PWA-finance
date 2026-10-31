"use client";

import { Archive } from "lucide-react";
import { useState } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { archiveAccount } from "../server/actions";

export function ArchiveButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-full gap-2 text-base text-muted-foreground underline underline-offset-4"
        onClick={() => setConfirming(true)}
      >
        <Archive className="size-5" aria-hidden="true" />
        {en.accounts.detail.archive}
      </Button>
    );
  }

  return (
    <form action={archiveAccount.bind(null, id)} className="space-y-3">
      <p role="alert" className="text-base">
        {en.accounts.detail.archiveConfirm}
      </p>
      <SubmitButton
        label={en.accounts.detail.archiveYes}
        pendingLabel={en.accounts.detail.archiveYes}
      />
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base"
        onClick={() => setConfirming(false)}
      >
        {en.accounts.form.cancel}
      </Button>
    </form>
  );
}
