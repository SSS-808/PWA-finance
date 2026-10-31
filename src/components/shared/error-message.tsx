"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";

export function ErrorMessage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-6">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="text-3xl font-semibold tracking-tight">
        {en.problem.crashTitle}
      </h1>
      <Button className="h-12 w-full text-base" onClick={() => retry()}>
        {en.problem.retry}
      </Button>
      <Button asChild variant="outline" className="h-12 w-full text-base">
        <Link href="/">{en.problem.goHome}</Link>
      </Button>
      {error.digest ? (
        <p className="text-sm break-words text-muted-foreground">
          {en.problem.code.replace("{code}", () => error.digest ?? "")}
        </p>
      ) : null}
    </div>
  );
}
