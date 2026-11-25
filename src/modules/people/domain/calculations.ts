import {
  type CurrencyCode,
  type Money,
  groupAmountInput,
  currencySymbol,
  isNegative,
  isZero,
  minorUnitOf,
  money,
  negate,
  sumByCurrency,
  toDecimalString,
} from "@/modules/money";
import type {
  EntryLabel,
  Jar,
  JarRow,
  JarStatus,
  Person,
  PersonEntry,
} from "./types";

// Above zero they owe you, below zero you owe them
export function jarStatus(balance: Money): JarStatus {
  if (isZero(balance)) return "paid";
  return isNegative(balance) ? "owe" : "owed";
}

export function openJars(person: Pick<Person, "jars">): Jar[] {
  return person.jars.filter((jar) => !isZero(jar.balance));
}

// Late means the date has passed and the jar is not paid off
export function isLate(jar: Jar, today: string): boolean {
  return jar.dueOn !== null && jar.dueOn < today && !isZero(jar.balance);
}

// What people owe you and what you owe, one line per currency; the two are never netted
export function totals(people: readonly Person[]): {
  owed: Money[];
  owe: Money[];
} {
  const balances = people.flatMap((person) =>
    person.jars.map((jar) => jar.balance),
  );
  return {
    owed: sumByCurrency(balances.filter((balance) => balance.minor > 0)),
    owe: sumByCurrency(
      balances.filter(isNegative).map((balance) => negate(balance)),
    ),
  };
}

export type DueLine =
  | { kind: "late"; date: string }
  | { kind: "due"; date: string }
  | { kind: "none" };

// The earliest late date wins, then the earliest coming date; paid-off jars say nothing
export function dueLine(person: Person, today: string): DueLine {
  const open = openJars(person);
  const late = open
    .filter((jar) => isLate(jar, today))
    .map((jar) => jar.dueOn as string)
    .sort();
  if (late[0] !== undefined) return { kind: "late", date: late[0] };
  const coming = open
    .map((jar) => jar.dueOn)
    .filter((date): date is string => date !== null)
    .sort();
  if (coming[0] !== undefined) return { kind: "due", date: coming[0] };
  return { kind: "none" };
}

// Open people, late first and then by name, and the paid-off ones apart
export function splitPeople(
  people: readonly Person[],
  today: string,
): { open: Person[]; paidOff: Person[] } {
  const byName = (a: Person, b: Person) => a.name.localeCompare(b.name);
  const lateRank = (person: Person) =>
    dueLine(person, today).kind === "late" ? 0 : 1;
  const open = people
    .filter((person) => openJars(person).length > 0)
    .sort((a, b) => lateRank(a) - lateRank(b) || byName(a, b));
  const paidOff = people
    .filter((person) => openJars(person).length === 0)
    .sort(byName);
  return { open, paidOff };
}

// Money moving into the jar is lent, or pays off what you owed; money leaving it is borrowed, or pays you back
function transferLabel(change: Money, before: Money): EntryLabel {
  if (change.minor > 0) return before.minor < 0 ? "you_paid_back" : "lent";
  return before.minor > 0 ? "paid_back" : "borrowed";
}

// Labels every row by the jar's running balance and lists them newest first
export function labelEntries(rows: readonly JarRow[]): PersonEntry[] {
  const oldestFirst = [...rows].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
  const balances = new Map<string, Money>();
  const labelled = oldestFirst.map((row): PersonEntry => {
    const before = balances.get(row.jarId) ?? money(0, row.amount.currency);
    balances.set(
      row.jarId,
      money(before.minor + row.amount.minor, row.amount.currency),
    );
    if (row.kind === "transfer") {
      return { ...row, label: transferLabel(row.amount, before) };
    }
    return { ...row, label: row.kind === "adjustment" ? "before" : "forgiven" };
  });
  return labelled.reverse();
}

// Account minor units for one whole unit of the jar's currency, rounded
function rateMinor(jarAmount: Money, accountAmount: Money): number {
  return Math.round(
    (accountAmount.minor * 10 ** minorUnitOf(jarAmount.currency)) /
      jarAmount.minor,
  );
}

function symbolAmount(minor: number, currency: CurrencyCode): string {
  const text = toDecimalString(money(minor, currency));
  // Every currency has decimals, so the text always holds a point
  const trimmed = text.replace(/\.?0+$/, "");
  return `${currencySymbol(currency)}${groupAmountInput(trimmed)}`;
}

// "1 ฿ = ₭600" worked out from the two amounts; both must be above zero
export function rateText(jarAmount: Money, accountAmount: Money): string {
  const rate = rateMinor(jarAmount, accountAmount);
  return `1 ${currencySymbol(jarAmount.currency)} = ${symbolAmount(rate, accountAmount.currency)}`;
}
