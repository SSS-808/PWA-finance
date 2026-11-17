import { KeyRound } from "lucide-react";
import { en } from "@/messages/en";
import { listAccounts } from "@/modules/accounts";
import { currencySymbol } from "@/modules/money";
import { getProfile } from "@/modules/profile";
import { MAX_KEYS } from "../domain/keys";
import { listShortcutKeys } from "../server/keys";
import { DeleteKeyButton } from "./delete-key-button";

const text = en.shortcut.settings;

// The keys with where each one adds and when it last did
export async function KeyList() {
  const [keys, accounts, profile] = await Promise.all([
    listShortcutKeys(),
    listAccounts(),
    getProfile(),
  ]);
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  // en-GB puts the day before the month, as in 17 Nov, 12:40
  const when = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: profile.timeZone,
  });

  return (
    <section aria-labelledby="shortcut-keys" className="space-y-2">
      <h2
        id="shortcut-keys"
        className="px-1 text-sm font-medium text-muted-foreground"
      >
        {text.keysHeading
          .replace("{n}", String(keys.length))
          .replace("{max}", String(MAX_KEYS))}
      </h2>
      {keys.length === 0 ? (
        <p className="px-1 text-base text-muted-foreground">
          {text.noKeysLine}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex min-h-14 items-center gap-3 px-4 py-3"
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
              >
                <KeyRound className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium break-words">{key.name}</p>
                <p className="text-sm break-words text-muted-foreground">
                  {text.addsTo
                    .replace(
                      "{account}",
                      () => accountById.get(key.accountId)?.name ?? "",
                    )
                    .replace("{symbol}", currencySymbol(key.currency))}
                </p>
                <p className="text-sm text-muted-foreground">
                  {key.lastUsedAt
                    ? text.lastUsed.replace(
                        "{when}",
                        when.format(new Date(key.lastUsedAt)),
                      )
                    : text.neverUsed}
                </p>
              </div>
              <DeleteKeyButton id={key.id} name={key.name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
