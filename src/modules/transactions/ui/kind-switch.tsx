import { CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { ENTRY_KINDS, type EntryKind } from "../domain/types";

export type AddKind = EntryKind | "transfer";

// The three choices of the Add page; editing an income or expense offers only the first two
export const ADD_KINDS: readonly AddKind[] = [...ENTRY_KINDS, "transfer"];

export function KindSwitch({
  kinds,
  value,
  onChange,
  transferOffline = false,
}: {
  kinds: readonly AddKind[];
  value: AddKind;
  onChange: (kind: AddKind) => void;
  // Transfers need the server, so with no internet that choice is greyed
  transferOffline?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={en.transactions.form.kind}
      className={cn(
        "grid gap-1 rounded-2xl bg-muted p-1",
        kinds.length === 3 ? "grid-cols-3" : "grid-cols-2",
      )}
    >
      {kinds.map((kind) => {
        const greyed = kind === "transfer" && transferOffline;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={value === kind}
            aria-disabled={greyed ? "true" : undefined}
            className={cn(
              "flex h-11 items-center justify-center gap-1 rounded-xl text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              value === kind
                ? "bg-card font-semibold text-foreground shadow-sm"
                : "text-foreground",
              greyed && "opacity-50",
            )}
            onClick={() => onChange(kind)}
          >
            {greyed ? (
              <CloudOff aria-hidden="true" className="size-4 shrink-0" />
            ) : null}
            {en.transactions.kinds[kind]}
          </button>
        );
      })}
    </div>
  );
}
