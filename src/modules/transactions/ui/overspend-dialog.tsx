"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import type { OverspendWarning } from "../domain/overspend";

// The form data to save if the person insists, and the numbers for the pop-up text
type Overspend = OverspendWarning & { data: FormData; open: boolean };

export type OverspendControl = ReturnType<typeof useOverspend>;

export function useOverspend() {
  const [current, setCurrent] = useState<Overspend | null>(null);
  return {
    current,
    ask: (next: Omit<Overspend, "open">) => setCurrent({ ...next, open: true }),
    // The values stay while the pop-up closes, so its text does not empty first
    close: () => setCurrent((value) => value && { ...value, open: false }),
  };
}

// The pop-up for an expense or transfer that is more than the account has free to spend
export function OverspendDialog({
  control,
  onSave,
}: {
  control: OverspendControl;
  onSave: (data: FormData) => void;
}) {
  const { current, close } = control;
  return (
    <ConfirmDialog
      open={current?.open ?? false}
      title={en.transactions.overspend.title}
      confirmLabel={en.transactions.overspend.saveAnyway}
      cancelLabel={en.transactions.overspend.goBack}
      onConfirm={() => {
        if (!current) return;
        close();
        onSave(current.data);
      }}
      onCancel={close}
    >
      {current
        ? en.transactions.overspend.body
            .replace("{free}", formatMoney(current.free))
            .replace("{minimum}", formatMoney(current.minimum))
            .replace("{account}", () => current.account)
        : null}
    </ConfirmDialog>
  );
}
