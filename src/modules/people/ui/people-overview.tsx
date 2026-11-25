import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import { type Money, formatMoney, money } from "@/modules/money";
import {
  dueLine,
  jarStatus,
  openJars,
  splitPeople,
  totals,
} from "../domain/calculations";
import { formatDay } from "../domain/format";
import type { Person } from "../domain/types";

function TotalCard({
  label,
  amounts,
  tone,
}: {
  label: string;
  amounts: readonly Money[];
  tone: "text-primary" | "text-expense";
}) {
  const lines = amounts.length > 0 ? amounts : [money(0, "LAK")];
  return (
    <div className="space-y-1 rounded-2xl border border-border bg-card px-4 py-3.5">
      <p className="text-sm text-muted-foreground">{label}</p>
      {lines.map((amount, index) => (
        <p
          key={amount.currency}
          className={cn(
            "font-semibold tabular-nums",
            index === 0 ? "text-xl" : "text-base",
            amounts.length === 0 ? "text-muted-foreground" : tone,
          )}
        >
          {formatMoney(amount)}
        </p>
      ))}
    </div>
  );
}

function MoveButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button asChild className="h-12 rounded-full text-base">
        <Link href="/people/move?kind=lend">
          <ArrowUpRight className="size-5" aria-hidden="true" />
          {en.people.lend}
        </Link>
      </Button>
      <Button
        asChild
        variant="outline"
        className="h-12 rounded-full bg-card text-base"
      >
        <Link href="/people/move?kind=borrow">
          <ArrowDownLeft className="size-5" aria-hidden="true" />
          {en.people.borrow}
        </Link>
      </Button>
    </div>
  );
}

function absMoney(amount: Money): Money {
  return money(Math.abs(amount.minor), amount.currency);
}

function PersonRow({ person, today }: { person: Person; today: string }) {
  const open = openJars(person);
  const due = dueLine(person, today);
  const late = due.kind === "late";
  const sameWay =
    open.every((jar) => jarStatus(jar.balance) === "owed") ||
    open.every((jar) => jarStatus(jar.balance) === "owe");
  const firstStatus = open[0] ? jarStatus(open[0].balance) : "paid";
  const avatar = late
    ? "bg-expense-soft text-expense"
    : open.length === 0
      ? "bg-muted text-muted-foreground"
      : firstStatus === "owe"
        ? "bg-expense-soft text-expense"
        : "bg-primary-soft text-primary";
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/people/${person.id}`}
        className="flex items-center gap-3 py-3 hover:bg-muted"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full font-semibold",
            avatar,
          )}
        >
          {person.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="flex min-w-0 grow flex-col">
          <span className="text-base font-medium break-words">
            {person.name}
          </span>
          {due.kind === "late" ? (
            <span className="text-sm font-medium text-expense">
              {en.people.late.replace("{date}", formatDay(due.date, today))}
            </span>
          ) : null}
          {due.kind === "due" ? (
            <span className="text-sm text-muted-foreground">
              {en.people.payBackBy.replace(
                "{date}",
                formatDay(due.date, today),
              )}
            </span>
          ) : null}
        </span>
        <span className="flex flex-col items-end">
          {open.map((jar, index) => {
            const owed = jarStatus(jar.balance) === "owed";
            return (
              <span key={jar.id} className="flex flex-col items-end">
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    index === 0 ? "text-base" : "text-sm",
                    owed ? "text-primary" : "text-expense",
                  )}
                >
                  {formatMoney(absMoney(jar.balance))}
                </span>
                {!sameWay || index === open.length - 1 ? (
                  <span className="text-xs text-muted-foreground">
                    {owed ? en.people.owesYou : en.people.youOweShort}
                  </span>
                ) : null}
              </span>
            );
          })}
        </span>
      </Link>
    </li>
  );
}

function PersonCard({
  id,
  heading,
  people,
  today,
}: {
  id: string;
  heading: string;
  people: readonly Person[];
  today: string;
}) {
  if (people.length === 0) return null;
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="px-1 text-sm font-medium text-muted-foreground">
        {heading}
      </h2>
      <ul className="rounded-2xl border border-border bg-card px-4">
        {people.map((person) => (
          <PersonRow key={person.id} person={person} today={today} />
        ))}
      </ul>
    </section>
  );
}

// The totals, the Lend and Borrow buttons, and everyone, late first, with the paid-off ones at the bottom
export function PeopleOverview({
  people,
  today,
}: {
  people: readonly Person[];
  today: string;
}) {
  if (people.length === 0) {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl border border-border bg-card px-5 py-6 text-xl font-semibold">
          {en.people.empty}
        </p>
        <MoveButtons />
      </div>
    );
  }
  const { open, paidOff } = splitPeople(people, today);
  const sums = totals(people);
  return (
    <div className="space-y-6">
      <section
        aria-label={en.people.totalsLabel}
        className="grid grid-cols-2 gap-3"
      >
        <TotalCard
          label={en.people.owedToYou}
          amounts={sums.owed}
          tone="text-primary"
        />
        <TotalCard
          label={en.people.youOwe}
          amounts={sums.owe}
          tone="text-expense"
        />
      </section>
      <MoveButtons />
      <PersonCard
        id="people-open"
        heading={en.people.peopleHeading.replace("{n}", String(open.length))}
        people={open}
        today={today}
      />
      <PersonCard
        id="people-paid-off"
        heading={en.people.paidOffHeading}
        people={paidOff}
        today={today}
      />
    </div>
  );
}
