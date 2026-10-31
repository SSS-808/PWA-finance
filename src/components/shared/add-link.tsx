import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";

// The "+ Add" pill in a page header; the label tells screen readers what it adds
export function AddLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild className="h-11 shrink-0 rounded-full px-4 text-base">
      <Link href={href} aria-label={label}>
        <Plus className="size-5" aria-hidden="true" />
        {en.common.add}
      </Link>
    </Button>
  );
}
