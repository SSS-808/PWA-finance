import { z } from "zod";
import type { CurrencyCode } from "@/modules/money";

export const MAX_KEYS = 3;
export const MAX_KEY_NAME = 40;

export const newKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name_required")
    .max(MAX_KEY_NAME, "name_too_long"),
  accountId: z.uuid({ error: "account_required" }),
});

export type ShortcutKey = {
  id: string;
  name: string;
  accountId: string;
  currency: CurrencyCode;
  createdAt: string;
  lastUsedAt: string | null;
};

export type ShortcutKeyErrorKey =
  "name_required" | "name_too_long" | "account_required" | "limit" | "unknown";

export type NewKeyState =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors?: Partial<Record<"name" | "accountId", ShortcutKeyErrorKey>>;
      error?: ShortcutKeyErrorKey;
    }
  | { status: "created"; name: string; key: string };
