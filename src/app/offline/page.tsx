import { CloudOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { en } from "@/messages/en";

export const metadata: Metadata = { title: en.offline.title };

// The offline helper shows this, without any data, for pages it hasn't saved
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <div className="space-y-6">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <CloudOff className="size-6" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">
          {en.offline.title}
        </h1>
        <p className="text-base text-muted-foreground">{en.offline.body}</p>
        <Button asChild className="h-12 w-full text-base">
          <Link href="/">{en.problem.goHome}</Link>
        </Button>
      </div>
    </main>
  );
}
