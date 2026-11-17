import { z } from "zod";

// "pw_" and 32 random bytes in base64url
export const KEY_PATTERN = /^pw_[A-Za-z0-9_-]{43}$/;
export const MAX_BODY_LENGTH = 2000;

// The key from an "Authorization: Bearer pw_…" header, or null when there is none or it has the wrong shape
export function readBearerKey(header: string | null): string | null {
  const key = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? "")?.[1];
  return key !== undefined && KEY_PATTERN.test(key) ? key : null;
}

// Live Text may keep a symbol or code next to the number ("₭25,000", "25,000 LAK"), so only digits, commas and dots stay
export function cleanAmount(input: string): string {
  return input.replace(/[^0-9.,]/g, "");
}

export const shortcutBodySchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(z.string().trim().min(1).max(40)),
  category: z.string().trim().max(60).default(""),
  note: z.string().trim().max(200).default(""),
});

export type ShortcutBody = z.output<typeof shortcutBodySchema>;

const refusals = [
  "bad_key",
  "bad_amount",
  "bad_note",
  "account_archived",
  "too_many",
  "no_category",
  "duplicate",
] as const;

// What shortcut_add_expense answers
export const addResultSchema = z.union([
  z.object({
    status: z.literal("saved"),
    amount_minor: z.number().int().positive(),
    currency: z.string(),
    account: z.string(),
    category: z.string(),
  }),
  z.object({ status: z.enum(refusals) }),
]);

export type AddResult = z.output<typeof addResultSchema>;
