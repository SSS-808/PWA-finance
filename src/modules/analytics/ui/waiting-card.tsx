import { ChartColumn } from "lucide-react";
import { en } from "@/messages/en";

// Stands in for the cards that need 2 full months, and says when they come
export function WaitingCard({
  title,
  counted,
}: {
  title: string;
  counted: string | null;
}) {
  const text = en.insights;
  const have =
    counted === null
      ? text.waitingNone
      : text.waitingOne.replace("{month}", counted);
  return (
    <section className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-card p-4">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cat-teal-soft text-cat-teal"
      >
        <ChartColumn className="size-5" />
      </span>
      <div className="min-w-0 space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {text.waitingBody.replace("{have}", have)}
        </p>
      </div>
    </section>
  );
}
