"use client";

import { ChevronRight, CloudUpload } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { en } from "@/messages/en";
import { readOutbox } from "../client/outbox-store";
import { OUTBOX_EVENT, outboxCounts } from "../domain/outbox";

type Counts = { waiting: number; refused: number };

function titleFor({ waiting, refused }: Counts): string {
  if (waiting === 0) {
    return en.outbox.homeRefused.replace("{count}", String(refused));
  }
  return waiting === 1
    ? en.outbox.homeWaitingOne
    : en.outbox.homeWaiting.replace("{count}", String(waiting));
}

// Home's slim line for entries that are only on this phone so far
export function OutboxLine({ userId }: { userId: string }) {
  const [counts, setCounts] = useState<Counts>({ waiting: 0, refused: 0 });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const next = outboxCounts(await readOutbox(), userId);
        if (active) setCounts(next);
      } catch {
        // No outbox on this phone means nothing to show
      }
    }
    void load();
    window.addEventListener(OUTBOX_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(OUTBOX_EVENT, load);
    };
  }, [userId]);

  if (counts.waiting + counts.refused === 0) return null;
  return (
    <Link
      href="/waiting"
      className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cat-amber-soft text-cat-amber"
      >
        <CloudUpload className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold break-words">
          {titleFor(counts)}
        </span>
        <span className="block text-sm break-words text-muted-foreground">
          {en.outbox.homeDetail}
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}
