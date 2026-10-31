import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { formatMoney } from "@/modules/money";
import type { Contribution } from "../server/queries";

// The latest contributions, newest first; they can be added but never changed
export function ContributionHistory({
  contributions,
}: {
  contributions: readonly Contribution[];
}) {
  return (
    <section aria-labelledby="goal-history" className="space-y-2">
      <h2 id="goal-history" className="text-xl font-semibold">
        {en.goals.history}
      </h2>
      {contributions.length === 0 ? (
        <p className="text-base text-muted-foreground">{en.goals.noHistory}</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {contributions.map((item) => (
            <li
              key={item.id}
              className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 text-base"
            >
              <span className="text-muted-foreground tabular-nums">
                {item.date}
              </span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  item.amount.minor > 0 && "text-income",
                  item.amount.minor < 0 && "text-expense",
                )}
              >
                {formatMoney(item.amount, { signDisplay: "always" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
