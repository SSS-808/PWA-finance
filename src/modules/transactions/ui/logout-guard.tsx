"use client";

import { useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { en } from "@/messages/en";
import { clearOutbox, readOutbox } from "../client/outbox-store";
import { outboxCounts } from "../domain/outbox";

// Wraps the log-out form: entries still on the phone are warned about before they are deleted
export function LogoutGuard({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [count, setCount] = useState<number | null>(null);
  const confirmed = useRef(false);
  const form = useRef<HTMLFormElement | null>(null);

  function submitAgain() {
    confirmed.current = true;
    // The submit event fires at once, so the guard is armed again right after
    form.current?.requestSubmit();
    confirmed.current = false;
  }

  async function check(target: HTMLFormElement) {
    form.current = target;
    let left = 0;
    try {
      const counts = outboxCounts(await readOutbox(), userId);
      left = counts.waiting + counts.refused;
    } catch {
      // An outbox that can't be read has nothing to lose
    }
    if (left === 0) submitAgain();
    else setCount(left);
  }

  async function logOutAnyway() {
    try {
      await clearOutbox();
    } catch {
      // Logging out matters more than clearing
    }
    setCount(null);
    submitAgain();
  }

  return (
    <div
      onSubmitCapture={(event) => {
        if (confirmed.current) return;
        event.preventDefault();
        if (event.target instanceof HTMLFormElement) {
          void check(event.target);
        }
      }}
    >
      {children}
      <ConfirmDialog
        open={count !== null}
        title={
          count === 1
            ? en.outbox.logoutTitleOne
            : en.outbox.logoutTitle.replace("{count}", String(count ?? 0))
        }
        confirmLabel={en.outbox.logoutAnyway}
        cancelLabel={en.outbox.logoutStay}
        risky
        onConfirm={() => void logOutAnyway()}
        onCancel={() => setCount(null)}
      >
        {en.outbox.logoutBody}
      </ConfirmDialog>
    </div>
  );
}
