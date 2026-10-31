import { cn } from "@/lib/utils";
import { en } from "@/messages/en";

// A grey placeholder shape that pulses while content loads; hidden from screen readers
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-pulse rounded-lg bg-muted motion-reduce:animate-none",
        className,
      )}
    />
  );
}

// The one line a screen reader hears for a whole loading screen
export function LoadingStatus() {
  return (
    <p role="status" className="sr-only">
      {en.common.loading}
    </p>
  );
}

// A small label over a card of rows, shaped like a list of accounts or history items
export function CardListSkeleton({
  rows = 3,
  label = true,
}: {
  rows?: number;
  label?: boolean;
}) {
  return (
    <div aria-hidden="true" className="space-y-2">
      {label ? <Skeleton className="h-4 w-28" /> : null}
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex min-h-16 items-center gap-3 px-4 py-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// A form: the real title (when given) with a pill where the save button goes, then label and input bars
export function FormSkeleton({
  title,
  fields = 3,
}: {
  title?: string;
  fields?: number;
}) {
  return (
    <div className="space-y-6">
      {title ? (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-background py-2">
          <h1 className="text-3xl font-semibold tracking-tight break-words">
            {title}
          </h1>
          <Skeleton className="h-11 w-20 rounded-full" />
        </div>
      ) : null}
      {Array.from({ length: fields }, (_, field) => (
        <div key={field} aria-hidden="true" className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

// A big card, standing in for the emerald balance card or a goal card
export function HeroSkeleton() {
  return <Skeleton className="h-40 w-full rounded-2xl" />;
}
