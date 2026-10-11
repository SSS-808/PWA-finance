"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { archiveGoal } from "../server/actions";

export function ArchiveButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base"
        onClick={() => setConfirming(true)}
      >
        {en.goals.archive}
      </Button>
    );
  }

  return (
    <form action={archiveGoal.bind(null, id)} className="space-y-3">
      <p role="alert" className="text-base">
        {en.goals.archiveConfirm}
      </p>
      <SubmitButton
        label={en.goals.archiveYes}
        pendingLabel={en.goals.archiveYes}
      />
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base"
        onClick={() => setConfirming(false)}
      >
        {en.goals.form.cancel}
      </Button>
    </form>
  );
}
