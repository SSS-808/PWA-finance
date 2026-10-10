"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";
import { hideCategory } from "../server/actions";

export function HideButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base"
        onClick={() => setConfirming(true)}
      >
        {en.categories.detail.hide}
      </Button>
    );
  }

  return (
    <form action={hideCategory.bind(null, id)} className="space-y-3">
      <p role="alert" className="text-base">
        {en.categories.detail.hideConfirm}
      </p>
      <SubmitButton
        label={en.categories.detail.hideYes}
        pendingLabel={en.categories.detail.hideYes}
      />
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full text-base"
        onClick={() => setConfirming(false)}
      >
        {en.categories.form.cancel}
      </Button>
    </form>
  );
}
