import { Button } from "@/components/ui/button";
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
}: {
  kinds: readonly AddKind[];
  value: AddKind;
  onChange: (kind: AddKind) => void;
}) {
  return (
    <div
      role="group"
      aria-label={en.transactions.form.kind}
      className={cn(
        "grid gap-2",
        kinds.length === 3 ? "grid-cols-3" : "grid-cols-2",
      )}
    >
      {kinds.map((kind) => (
        <Button
          key={kind}
          type="button"
          variant={value === kind ? "default" : "outline"}
          aria-pressed={value === kind}
          className="h-12 text-base"
          onClick={() => onChange(kind)}
        >
          {en.transactions.kinds[kind]}
        </Button>
      ))}
    </div>
  );
}
