import { ChevronRight, Settings } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LoadingStatus, Skeleton } from "@/components/shared/skeleton";
import { en } from "@/messages/en";
import { MoreTiles, getMoreStatus } from "@/modules/more";

export default function MorePage() {
  return (
    <div className="w-full max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{en.more.title}</h1>
      <Suspense
        fallback={
          <div className="space-y-3">
            <LoadingStatus />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          </div>
        }
      >
        <MoreContent />
      </Suspense>
      <Link
        href="/settings"
        className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted"
      >
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <Settings className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">
            {en.more.settings}
          </span>
          <span className="block text-sm text-muted-foreground">
            {en.more.settingsHint}
          </span>
        </span>
        <ChevronRight
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}

async function MoreContent() {
  return <MoreTiles status={await getMoreStatus()} />;
}
