import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import { formatDay } from "../domain/format";
import type { PersonEntry } from "../domain/types";
import { DeleteEntryButton } from "./delete-entry-button";

function details(entry: PersonEntry, today: string): string {
  const parts = [formatDay(entry.date, today)];
  if (entry.otherAccount) {
    parts.push(
      (entry.amount.minor > 0
        ? en.people.fromAccount
        : en.people.intoAccount
      ).replace("{account}", () => entry.otherAccount ?? ""),
    );
  }
  if (entry.note) parts.push(entry.note);
  return parts.join(" · ");
}

// Every entry on the person's jars, newest first
export function HistoryList({
  personId,
  entries,
  today,
}: {
  personId: string;
  entries: readonly PersonEntry[];
  today: string;
}) {
  return (
    <section aria-labelledby="person-history" className="space-y-2">
      <h2
        id="person-history"
        className="px-1 text-sm font-medium text-muted-foreground"
      >
        {en.people.historyHeading}
      </h2>
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-4 text-base text-muted-foreground">
          {en.people.noHistory}
        </p>
      ) : (
        <ul className="rounded-2xl border border-border bg-card pr-1 pl-4">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-2 border-b border-border py-1 last:border-b-0"
            >
              <span className="flex min-w-0 grow flex-col py-2">
                <span className="text-base font-medium">
                  {en.people.labels[entry.label]}
                </span>
                <span className="text-sm break-words text-muted-foreground">
                  {details(entry, today)}
                </span>
              </span>
              <span
                className={cn(
                  "text-base font-semibold tabular-nums",
                  (entry.label === "paid_back" ||
                    entry.label === "you_paid_back") &&
                    "text-primary",
                )}
              >
                {formatMoney(entry.amount)}
              </span>
              <DeleteEntryButton
                personId={personId}
                entryId={entry.id}
                transferId={entry.transferId ?? ""}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
