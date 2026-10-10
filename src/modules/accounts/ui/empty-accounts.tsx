import Link from "next/link";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";

export function EmptyAccounts() {
  return (
    <div className="space-y-4 rounded-lg border border-border px-4 py-6">
      <h2 className="text-xl font-semibold">{en.accounts.emptyTitle}</h2>
      <Button asChild className="h-12 w-full text-base">
        <Link href="/accounts/new">{en.accounts.addFirst}</Link>
      </Button>
    </div>
  );
}
