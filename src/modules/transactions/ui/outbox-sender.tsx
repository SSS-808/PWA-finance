"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { en } from "@/messages/en";
import {
  putOutboxEntry,
  readOutbox,
  removeOutboxEntry,
} from "../client/outbox-store";
import {
  OUTBOX_EVENT,
  OUTBOX_SEND_EVENT,
  OUTBOX_WAIT_MS,
  type OutboxResult,
  applyResult,
  fromOtherUsers,
  stopsSending,
  toOutboxInput,
  toSend,
} from "../domain/outbox";
import { sendOutboxEntry } from "../server/outbox-actions";

const RETRY_EVERY_MS = 30_000;

const failed: OutboxResult = { status: "failed" };

// A throw or no answer in time counts as a failed try
function sendWithin(
  input: Parameters<typeof sendOutboxEntry>[0],
): Promise<OutboxResult> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(failed), OUTBOX_WAIT_MS);
    sendOutboxEntry(input).then(
      (result) => {
        window.clearTimeout(timer);
        resolve(result);
      },
      () => {
        window.clearTimeout(timer);
        resolve(failed);
      },
    );
  });
}

// Sends what waits in the phone's outbox while the app is open; it shows nothing itself
export function OutboxSender({ userId }: { userId: string }) {
  const router = useRouter();
  const running = useRef(false);

  useEffect(() => {
    let stopped = false;
    let retry: number | undefined;

    function schedule(waiting: number) {
      window.clearInterval(retry);
      retry = undefined;
      if (waiting > 0) retry = window.setInterval(trigger, RETRY_EVERY_MS);
    }

    function trigger() {
      if (document.visibilityState === "visible") void sendAll();
    }

    async function sendAll() {
      if (running.current || navigator.onLine === false) return;
      running.current = true;
      try {
        const entries = await readOutbox();
        let changed = false;
        for (const other of fromOtherUsers(entries, userId)) {
          await removeOutboxEntry(other.id);
          changed = true;
        }

        let sent = 0;
        for (const entry of toSend(entries, userId)) {
          const result = await sendWithin(toOutboxInput(entry));
          const next = applyResult(entry, result);
          if (next === null) {
            await removeOutboxEntry(entry.id);
            changed = true;
          } else if (next !== entry) {
            await putOutboxEntry(next);
            changed = true;
          }
          if (result.status === "saved" || result.status === "already_saved") {
            sent += 1;
          }
          if (stopsSending(result)) break;
        }

        if (changed) window.dispatchEvent(new Event(OUTBOX_EVENT));
        if (sent > 0) {
          toast(
            sent === 1
              ? en.outbox.sentOne
              : en.outbox.sent.replace("{count}", String(sent)),
          );
          router.refresh();
        }
        if (!stopped) schedule(toSend(await readOutbox(), userId).length);
      } catch {
        // The outbox could not be read or written; the next trigger tries again
      } finally {
        running.current = false;
      }
    }

    // A waiting entry added on this page is noticed here, so the 30 s retry starts
    async function watch() {
      try {
        schedule(toSend(await readOutbox(), userId).length);
      } catch {
        // Nothing to retry if the outbox can't be read
      }
    }

    void sendAll();
    window.addEventListener("online", trigger);
    document.addEventListener("visibilitychange", trigger);
    window.addEventListener(OUTBOX_SEND_EVENT, trigger);
    window.addEventListener(OUTBOX_EVENT, watch);
    return () => {
      stopped = true;
      window.clearInterval(retry);
      window.removeEventListener("online", trigger);
      document.removeEventListener("visibilitychange", trigger);
      window.removeEventListener(OUTBOX_SEND_EVENT, trigger);
      window.removeEventListener(OUTBOX_EVENT, watch);
    };
  }, [userId, router]);

  return null;
}
