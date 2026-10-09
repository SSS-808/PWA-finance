"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { deleteEntry } from "../server/actions";

export function DeleteEntryButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base"
        onClick={() => setConfirming(true)}
      >
        {en.transactions.delete}
      </Button>
    );
  }

  return (
    <form action={deleteEntry.bind(null, id)} className="space-y-3">
      <p role="alert" className="text-base">
        {en.transactions.deleteConfirm}
      </p>
      <SubmitButton
        label={en.transactions.deleteYes}
        pendingLabel={en.transactions.deleteYes}
      />
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base"
        onClick={() => setConfirming(false)}
      >
        {en.transactions.cancel}
      </Button>
    </form>
  );
}
