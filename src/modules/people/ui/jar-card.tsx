import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { type Money, formatMoney, money } from "@/modules/money";
import { isLate, jarStatus } from "../domain/calculations";
import { formatDay } from "../domain/format";
import type { Jar } from "../domain/types";
import { ForgiveButton } from "./forgive-button";

// One open jar: what is owed in one currency, its date and what you can do about it
export function JarCard({
  personId,
  personName,
  jar,
  today,
}: {
  personId: string;
  personName: string;
  jar: Jar;
  today: string;
}) {
  const owed = jarStatus(jar.balance) === "owed";
  const currency = en.people.currencyNames[jar.currency];
  const amount: Money = money(Math.abs(jar.balance.minor), jar.currency);
  const late = isLate(jar, today);
  const dialog = en.people.forgiveDialog;
  const name = (text: string) =>
    text
      .replace("{name}", () => personName)
      .replace("{amount}", () => formatMoney(amount))
      .replace("{currency}", () => currency);
  return (
    <section
      aria-label={currency}
      className="space-y-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {(owed ? en.people.jarOwed : en.people.jarOwe).replace(
            "{currency}",
            currency,
          )}
        </p>
        {jar.dueOn ? (
          <p
            className={cn(
              "text-sm text-muted-foreground",
              late && "font-medium text-expense",
            )}
          >
            {(late ? en.people.late : en.people.payBackBy).replace(
              "{date}",
              formatDay(jar.dueOn, today),
            )}
          </p>
        ) : null}
      </div>
      <p
        className={cn(
          "text-3xl font-semibold tabular-nums",
          owed ? "text-primary" : "text-expense",
        )}
      >
        {formatMoney(amount)}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Button
          asChild
          className="h-11 rounded-full px-2 text-sm min-[360px]:text-base"
        >
          <Link href={`/people/${personId}/repay?jar=${jar.id}`}>
            {owed ? en.people.paidBack : en.people.iPaidBack}
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-full px-2 text-sm min-[360px]:text-base"
        >
          <Link
            href={`/people/move?kind=${owed ? "lend" : "borrow"}&person=${personId}`}
          >
            {owed ? en.people.lendMore : en.people.borrowMore}
          </Link>
        </Button>
        <ForgiveButton
          personId={personId}
          jarId={jar.id}
          title={name(owed ? dialog.title : dialog.titleOwe)}
          body={name(owed ? dialog.body : dialog.bodyOwe)}
          confirmLabel={owed ? name(dialog.confirm) : dialog.confirmOwe}
        />
      </div>
    </section>
  );
}
