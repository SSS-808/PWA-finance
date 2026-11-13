import type { ReactNode } from "react";
import { HelpHint } from "@/components/shared/help-hint";

// The frame every Insights card shares: a title with its "?" hint, an optional subtitle, then the content
export function InsightsCard({
  id,
  title,
  help,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  help: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h2 id={id} className="text-lg font-semibold">
            {title}
          </h2>
          <HelpHint label={title}>{help}</HelpHint>
        </div>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
