import { TriangleAlert } from "lucide-react";
import { SubmitButton } from "@/components/shared/submit-button";
import { en } from "@/messages/en";
import { type Money, formatMoney } from "@/modules/money";
import { takeOutMissing } from "../server/actions";
import { fill } from "./fill";

// One line per account holding money for the goal, inside the goal's card
export function GoalAccountShares({
  shares,
}: {
  shares: readonly { id: string; label: string; amount: Money }[];
}) {
  if (shares.length === 0) return null;
  return (
    <dl className="space-y-2 border-t border-border pt-3">
      {shares.map((share) => (
        <div
          key={share.id}
          className="flex items-baseline justify-between gap-3 text-base"
        >
          <dt className="min-w-0 break-words text-muted-foreground">
            {fill(en.goals.where, { account: share.label })}
          </dt>
          <dd className="shrink-0 font-medium tabular-nums">
            {formatMoney(share.amount)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Shown when an account no longer holds the money set aside here; one tap takes out what is missing
export function GoalShortWarning({
  goalId,
  accountId,
  account,
  held,
  aside,
  missing,
}: {
  goalId: string;
  accountId: string;
  account: string;
  held: Money;
  aside: Money;
  missing: Money;
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-cat-amber-soft p-4 text-sm">
      <p className="flex items-start gap-2">
        <TriangleAlert
          className="mt-0.5 size-5 shrink-0 text-cat-amber"
          aria-hidden="true"
        />
        <span className="min-w-0 break-words">
          {fill(en.goals.short, {
            account,
            held: formatMoney(held),
            aside: formatMoney(aside),
          })}
        </span>
      </p>
      <form action={takeOutMissing.bind(null, goalId, accountId)}>
        <SubmitButton
          label={fill(en.goals.takeMissing, { missing: formatMoney(missing) })}
          pendingLabel={fill(en.goals.takeMissing, {
            missing: formatMoney(missing),
          })}
          variant="outline"
        />
      </form>
    </div>
  );
}
