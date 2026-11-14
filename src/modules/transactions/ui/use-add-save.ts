"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { en } from "@/messages/en";
import { putOutboxEntry } from "../client/outbox-store";
import {
  OUTBOX_EVENT,
  OUTBOX_WAIT_MS,
  type OutboxInput,
  type OutboxResult,
  fieldsFromForm,
  newOutboxEntry,
  withParam,
} from "../domain/outbox";
import { RELEASE_GOALS_FIELD } from "../domain/overspend";
import type { EntryFormState } from "../domain/types";
import { sendOutboxEntry } from "../server/outbox-actions";

const idleState: EntryFormState = { status: "idle" };
const unknownState: EntryFormState = { status: "error", error: "unknown" };

// Waits for the server, but gives up after the wait; a late answer is ignored by the caller
function sendWithin(input: OutboxInput): Promise<OutboxResult | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), OUTBOX_WAIT_MS);
    sendOutboxEntry(input).then(
      (result) => {
        window.clearTimeout(timer);
        resolve(result);
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

function refusedState(
  result: Extract<OutboxResult, { status: "refused" }>,
): EntryFormState {
  if (result.field) {
    return {
      status: "error",
      fieldErrors: { [result.field]: result.error },
    };
  }
  return { status: "error", error: result.error };
}

// Saves a new entry with a phone-made ID; with no answer in time it waits in the outbox under the same ID
export function useAddSave({
  userId,
  savedTo,
  onKept,
}: {
  userId: string;
  savedTo: string;
  // Called after the entry was kept on the phone, so the form can start empty
  onKept: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<EntryFormState>(idleState);
  const [pending, setPending] = useState(false);
  const running = useRef(false);

  async function keepOnPhone(input: OutboxInput) {
    try {
      await putOutboxEntry(newOutboxEntry(input, new Date()));
    } catch {
      setState(unknownState);
      setPending(false);
      return;
    }
    window.dispatchEvent(new Event(OUTBOX_EVENT));
    toast(en.outbox.savedOnPhone, {
      description: en.outbox.savedOnPhoneDetail,
    });
    setPending(false);
    onKept();
  }

  async function save(data: FormData) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setState(idleState);
    try {
      const input: OutboxInput = {
        id: crypto.randomUUID(),
        userId,
        fields: fieldsFromForm(data),
        releaseGoals: data.get(RELEASE_GOALS_FIELD) === "1",
      };
      if (navigator.onLine === false) {
        await keepOnPhone(input);
        return;
      }
      const result = await sendWithin(input);
      if (result === null) {
        await keepOnPhone(input);
        return;
      }
      switch (result.status) {
        case "saved":
        case "already_saved":
          // Stays pending while the next page loads
          router.push(withParam(savedTo, "saved", input.id));
          return;
        case "refused":
          setState(refusedState(result));
          break;
        case "signed_out":
          router.push("/login");
          return;
        case "other_user":
          window.location.reload();
          return;
        case "failed":
          setState(unknownState);
          break;
      }
      setPending(false);
    } finally {
      running.current = false;
    }
  }

  return { state, pending, save };
}
