import { z } from "zod";
import {
  ENTRY_FIELDS,
  type EntryFieldName,
  type EntryFormState,
  type TransactionErrorKey,
} from "./types";

export type OutboxFields = Record<EntryFieldName, string>;

// Same as WAIT_MS in public/sw.js
export const OUTBOX_WAIT_MS = 4000;

// Fired on window when the outbox changed, and to ask the sender to try now
export const OUTBOX_EVENT = "outbox-changed";
export const OUTBOX_SEND_EVENT = "outbox-send-now";

export type OutboxEntry = {
  // Made on the phone with crypto.randomUUID(), becomes transactions.id
  id: string;
  // Who was logged in when it was saved
  userId: string;
  // Exactly what the Add form would post
  fields: OutboxFields;
  // The overspend pop-up's "take it from goals" choice
  releaseGoals: boolean;
  // ISO time it went into the outbox
  savedAt: string;
  status: "waiting" | "refused";
  // Only when refused
  error?: TransactionErrorKey;
  // Only when refused because of one field
  field?: EntryFieldName;
};

export type OutboxResult =
  | { status: "saved" }
  | { status: "already_saved" }
  | { status: "refused"; error: TransactionErrorKey; field?: EntryFieldName }
  | { status: "signed_out" }
  | { status: "other_user" }
  | { status: "failed" };

type RefusedResult = Extract<OutboxResult, { status: "refused" }>;

const text = z.string().max(500);

export const outboxInputSchema = z.strictObject({
  id: z.uuid(),
  userId: z.uuid(),
  fields: z.strictObject({
    kind: text,
    amount: text,
    accountId: text,
    categoryId: text,
    date: text,
    note: text,
    tripId: text,
  }),
  releaseGoals: z.boolean(),
});

export type OutboxInput = z.infer<typeof outboxInputSchema>;

export function newOutboxEntry(input: OutboxInput, now: Date): OutboxEntry {
  return { ...input, savedAt: now.toISOString(), status: "waiting" };
}

export function toOutboxInput(entry: OutboxEntry): OutboxInput {
  return {
    id: entry.id,
    userId: entry.userId,
    fields: entry.fields,
    releaseGoals: entry.releaseGoals,
  };
}

// The first field error in form order, else the general error
export function refusalFrom(state: EntryFormState): RefusedResult {
  for (const field of ENTRY_FIELDS) {
    const key = state.fieldErrors?.[field];
    if (key) return { status: "refused", error: key, field };
  }
  return { status: "refused", error: state.error ?? "unknown" };
}

// Null means the entry leaves the outbox
export function applyResult(
  entry: OutboxEntry,
  result: OutboxResult,
): OutboxEntry | null {
  switch (result.status) {
    case "saved":
    case "already_saved":
    case "other_user":
      return null;
    case "refused": {
      const refused: OutboxEntry = {
        ...entry,
        status: "refused",
        error: result.error,
      };
      if (result.field) refused.field = result.field;
      else delete refused.field;
      return refused;
    }
    case "signed_out":
    case "failed":
      return entry;
  }
}

export function toSend(entries: OutboxEntry[], userId: string): OutboxEntry[] {
  return entries
    .filter((entry) => entry.status === "waiting" && entry.userId === userId)
    .sort(
      (a, b) => a.savedAt.localeCompare(b.savedAt) || a.id.localeCompare(b.id),
    );
}

export function fromOtherUsers(
  entries: OutboxEntry[],
  userId: string,
): OutboxEntry[] {
  return entries.filter((entry) => entry.userId !== userId);
}

export function outboxCounts(
  entries: OutboxEntry[],
  userId: string,
): { waiting: number; refused: number } {
  const mine = entries.filter((entry) => entry.userId === userId);
  return {
    waiting: mine.filter((entry) => entry.status === "waiting").length,
    refused: mine.filter((entry) => entry.status === "refused").length,
  };
}

// The rest of the batch waits for the next try
export function stopsSending(result: OutboxResult): boolean {
  return result.status === "signed_out" || result.status === "failed";
}

// The form's values as the outbox keeps them; anything that is not text becomes empty
export function fieldsFromForm(data: {
  get(name: string): unknown;
}): OutboxFields {
  const fields = {} as OutboxFields;
  for (const name of ENTRY_FIELDS) {
    const value = data.get(name);
    fields[name] = typeof value === "string" ? value : "";
  }
  return fields;
}

// Adds one value to a path on our own site, keeping any other query it has
export function withParam(path: string, name: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(name, value);
  return `${url.pathname}${url.search}${url.hash}`;
}
