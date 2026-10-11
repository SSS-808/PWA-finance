import { cn } from "@/lib/utils";

// A thin bar that fills to the percent (capped at 100); "over" turns it red
export function ProgressBar({
  label,
  percent,
  tone = "default",
}: {
  label: string;
  percent: number;
  tone?: "default" | "over";
}) {
  const width = Math.min(percent, 100);
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      className="block h-2 overflow-hidden rounded-full bg-muted"
    >
      <span
        className={cn(
          "block h-full rounded-full",
          tone === "over" ? "bg-destructive" : "bg-primary",
        )}
        style={{ width: `${width}%` }}
      />
    </span>
  );
}
