"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { en } from "@/messages/en";
import { formatMoney, isZero } from "@/modules/money";
import {
  type OverspendWarning,
  RELEASE_GOALS_FIELD,
} from "../domain/overspend";

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

const text = en.transactions.overspend;

function bodyText(warning: OverspendWarning): string {
  const { aside } = warning;
  // An account without a minimum leaves the bank's part out
  const goalsTemplate = isZero(warning.minimum)
    ? text.bodyGoalsOnly
    : text.bodyGoals;
  const template = aside
    ? goalsTemplate.replace("{aside}", () => formatMoney(aside))
    : text.body;
  return template
    .replace("{free}", formatMoney(warning.free))
    .replace("{minimum}", formatMoney(warning.minimum))
    .replace("{account}", () => warning.account);
}

// The extra button is only for a payment that can eat into money set aside for goals
function extraLabel(warning: OverspendWarning): string | null {
  const [first] = warning.goals;
  if (!warning.aside || first === undefined) return null;
  return warning.goals.length === 1
    ? text.takeFromGoal.replace("{goal}", () => first)
    : text.takeFromGoals;
}

// A copy of the form data that also asks the server to take the part spent out of the goals
function withRelease(data: FormData): FormData {
  const copy = new FormData();
  for (const [key, value] of data) copy.append(key, value);
  copy.set(RELEASE_GOALS_FIELD, "1");
  return copy;
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
  const label = current ? extraLabel(current) : null;
  return (
    <ConfirmDialog
      open={current?.open ?? false}
      title={text.title}
      confirmLabel={text.saveAnyway}
      cancelLabel={text.goBack}
      extra={
        current && label
          ? {
              label,
              onClick: () => {
                close();
                onSave(withRelease(current.data));
              },
            }
          : undefined
      }
      onConfirm={() => {
        if (!current) return;
        close();
        onSave(current.data);
      }}
      onCancel={close}
    >
      {current ? bodyText(current) : null}
    </ConfirmDialog>
  );
}
