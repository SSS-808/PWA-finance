import { SearchX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";

export function NotFoundMessage() {
  return (
    <div className="space-y-6">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <SearchX className="size-6" />
      </span>
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.problem.notFoundTitle}
      </h1>
      <Button asChild className="h-12 w-full text-base">
        <Link href="/">{en.problem.goHome}</Link>
      </Button>
    </div>
  );
}
