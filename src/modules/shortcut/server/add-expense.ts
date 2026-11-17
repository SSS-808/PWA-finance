import "server-only";
import { createAnonClient } from "@/lib/supabase/anon";
import { en } from "@/messages/en";
import {
  formatMoney,
  isCurrencyCode,
  isZero,
  money,
  negate,
  parseMoney,
} from "@/modules/money";
import {
  MAX_BODY_LENGTH,
  type AddResult,
  addResultSchema,
  cleanAmount,
  readBearerKey,
  shortcutBodySchema,
} from "../domain/request";

export type ShortcutReply = {
  status: number;
  body: { ok: boolean; message: string };
};

const text = en.shortcut.api;

function reply(status: number, message: string, ok = false): ShortcutReply {
  return { status, body: { ok, message } };
}

// Logs only the error code, never the key or the amount
function failed(error: { code: string }): ShortcutReply {
  console.error("The Shortcut could not save", { code: error.code });
  return reply(500, text.unknown);
}

function replyFor(result: AddResult): ShortcutReply {
  switch (result.status) {
    case "saved": {
      if (!isCurrencyCode(result.currency)) return reply(500, text.unknown);
      const amount = negate(money(result.amount_minor, result.currency));
      return reply(
        201,
        text.saved
          .replace("{category}", result.category)
          .replace("{amount}", formatMoney(amount))
          .replace("{account}", result.account),
        true,
      );
    }
    case "duplicate":
      return reply(200, text.duplicate, true);
    case "bad_key":
      return reply(401, text.badKey);
    case "bad_amount":
      return reply(400, text.badAmount);
    case "bad_note":
      return reply(400, text.badRequest);
    case "account_archived":
      return reply(409, text.accountArchived);
    case "no_category":
      return reply(422, text.noCategory);
    case "too_many":
      return reply(429, text.tooMany);
  }
}

// Adds one expense from the iPhone Shortcut; the key alone decides whose and which account
export async function addFromShortcut(
  authorization: string | null,
  body: string,
): Promise<ShortcutReply> {
  const key = readBearerKey(authorization);
  if (!key) return reply(401, text.badKey);
  if (body.length > MAX_BODY_LENGTH) return reply(413, text.badRequest);

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return reply(400, text.badRequest);
  }
  const parsed = shortcutBodySchema.safeParse(json);
  if (!parsed.success) return reply(400, text.badRequest);

  const supabase = createAnonClient();
  const { data: currency, error: keyError } = await supabase.rpc(
    "shortcut_key_currency",
    { p_key: key },
  );
  if (keyError) return failed(keyError);
  if (!currency || !isCurrencyCode(currency)) return reply(401, text.badKey);

  const amount = parseMoney(cleanAmount(parsed.data.amount), currency);
  if (!amount.ok || isZero(amount.value)) return reply(400, text.badAmount);

  const { data, error } = await supabase.rpc("shortcut_add_expense", {
    p_key: key,
    p_amount_minor: amount.value.minor,
    p_category: parsed.data.category,
    p_note: parsed.data.note,
  });
  if (error) return failed(error);
  const result = addResultSchema.safeParse(data);
  if (!result.success) return failed({ code: "unexpected_answer" });
  return replyFor(result.data);
}
