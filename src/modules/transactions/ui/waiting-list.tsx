"use client";

import { CircleAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { HelpHint } from "@/components/shared/help-hint";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import {
  type CurrencyCode,
  formatMoney,
  negate,
  parseMoney,
} from "@/modules/money";
import { readOutbox, removeOutboxEntry } from "../client/outbox-store";
import {
  OUTBOX_EVENT,
  OUTBOX_SEND_EVENT,
  type OutboxEntry,
} from "../domain/outbox";
import { shortDate } from "../domain/trip-for-date";
import type { TransactionErrorKey } from "../domain/types";

const SEND_PAUSE_MS = 2000;

type WaitingAccount = { id: string; name: string; currency: CurrencyCode };
type WaitingCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

function reasonFor(error: TransactionErrorKey | undefined): string {
  const key = error ?? "unknown";
  if (Object.hasOwn(en.outbox.reasons, key)) {
    return en.outbox.reasons[key as keyof typeof en.outbox.reasons];
  }
  return en.transactions.errors[key];
}

function amountText(
  entry: OutboxEntry,
  account: WaitingAccount | undefined,
): string {
  const raw = entry.fields.amount;
  if (!account) return raw;
  const parsed = parseMoney(raw, account.currency);
  if (!parsed.ok) return raw;
  return entry.fields.kind === "expense"
    ? formatMoney(negate(parsed.value))
    : formatMoney(parsed.value, { signDisplay: "always" });
}

function Row({
  entry,
  account,
  category,
  onDelete,
}: {
  entry: OutboxEntry;
  account: WaitingAccount | undefined;
  category: WaitingCategory | undefined;
  onDelete: () => void;
}) {
  const refused = entry.status === "refused";
  const name = category?.name ?? en.outbox.unknownCategory;
  const amount = amountText(entry, account);
  const details = [
    entry.fields.note,
    account?.name,
    entry.fields.date ? shortDate(entry.fields.date) : "",
  ].filter((part) => part);
  return (
    <li
      className={cn(
        "flex min-h-16 items-center gap-3 rounded-2xl border bg-card px-4 py-3",
        refused ? "border-destructive/50" : "border-border",
      )}
    >
      <CategoryIcon
        icon={category?.icon ?? "tag"}
        color={category?.color ?? "gray"}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium break-words">{name}</span>
        {refused ? (
          <span className="flex items-start gap-1 text-sm text-destructive">
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <span className="break-words">{reasonFor(entry.error)}</span>
          </span>
        ) : null}
        <span className="block text-sm break-words text-muted-foreground">
          {details.join(" · ")}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-right text-base font-medium tabular-nums",
          account && entry.fields.kind === "income" && "text-income",
          account && entry.fields.kind === "expense" && "text-expense",
        )}
      >
        {amount}
      </span>
      <button
        type="button"
        aria-label={en.outbox.deleteLabel
          .replace("{category}", () => name)
          .replace("{amount}", () => amount)}
        onClick={onDelete}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Trash2 aria-hidden="true" className="size-5" />
      </button>
    </li>
  );
}

// The entries kept on this phone: the ones waiting to be sent and the ones the server refused
export function WaitingList({
  userId,
  accounts,
  categories,
}: {
  userId: string;
  accounts: readonly WaitingAccount[];
  categories: readonly WaitingCategory[];
}) {
  // Null until the phone's outbox has been read
  const [entries, setEntries] = useState<OutboxEntry[] | null>(null);
  const [pausing, setPausing] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const all = await readOutbox();
        if (!active) return;
        setEntries(
          all
            .filter((entry) => entry.userId === userId)
            .sort((a, b) => a.savedAt.localeCompare(b.savedAt)),
        );
      } catch {
        if (active) setEntries([]);
      }
    }
    void load();
    window.addEventListener(OUTBOX_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(OUTBOX_EVENT, load);
    };
  }, [userId]);

  useEffect(() => {
    if (!pausing) return;
    const timer = window.setTimeout(() => setPausing(false), SEND_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [pausing]);

  async function remove(id: string) {
    try {
      await removeOutboxEntry(id);
    } catch {
      return;
    }
    window.dispatchEvent(new Event(OUTBOX_EVENT));
  }

  if (entries === null) return null;
  if (entries.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card px-4 py-6">
        <p className="text-base">{en.outbox.empty}</p>
        <Button asChild variant="outline" className="h-12 w-full text-base">
          <Link href="/">{en.nav.home}</Link>
        </Button>
      </div>
    );
  }

  const waiting = entries.filter((entry) => entry.status === "waiting");
  const refused = entries.filter((entry) => entry.status === "refused");
  const rows = (list: OutboxEntry[]) => (
    <ul className="space-y-2">
      {list.map((entry) => (
        <Row
          key={entry.id}
          entry={entry}
          account={accounts.find((a) => a.id === entry.fields.accountId)}
          category={categories.find((c) => c.id === entry.fields.categoryId)}
          onDelete={() => void remove(entry.id)}
        />
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      <Button
        type="button"
        disabled={pausing || waiting.length === 0}
        className="h-12 w-full rounded-full text-base"
        onClick={() => {
          setPausing(true);
          window.dispatchEvent(new Event(OUTBOX_SEND_EVENT));
        }}
      >
        {pausing ? en.outbox.sending : en.outbox.sendNow}
      </Button>
      {waiting.length > 0 ? (
        <section aria-labelledby="waiting-heading" className="space-y-2">
          <h2
            id="waiting-heading"
            className="px-1 text-sm font-medium text-muted-foreground"
          >
            {en.outbox.waitingHeading.replace(
              "{count}",
              String(waiting.length),
            )}
          </h2>
          {rows(waiting)}
        </section>
      ) : null}
      {refused.length > 0 ? (
        <section aria-labelledby="refused-heading" className="space-y-2">
          <div className="flex items-center gap-1 px-1">
            <h2
              id="refused-heading"
              className="text-sm font-medium text-destructive"
            >
              {en.outbox.refusedHeading.replace(
                "{count}",
                String(refused.length),
              )}
            </h2>
            <HelpHint label={en.outbox.refusedHelpLabel}>
              {en.outbox.refusedHelp}
            </HelpHint>
          </div>
          {rows(refused)}
        </section>
      ) : null}
    </div>
  );
}
