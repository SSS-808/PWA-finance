import { describe, expect, it } from "vitest";
import { type CurrencyCode, money } from "@/modules/money";
import {
  dueLine,
  isLate,
  jarStatus,
  labelEntries,
  openJars,
  rateText,
  splitPeople,
  totals,
} from "./calculations";
import type { Jar, JarRow, Person } from "./types";

const TODAY = "2026-11-24";

function jar(
  currency: CurrencyCode,
  minor: number,
  dueOn: string | null = null,
  id = `${currency}-${minor}`,
): Jar {
  return { id, currency, balance: money(minor, currency), dueOn };
}

function person(name: string, jars: Jar[]): Person {
  return { id: name, name, jars };
}

function row(overrides: Partial<JarRow> & { minor: number }): JarRow {
  const { minor, ...rest } = overrides;
  return {
    id: "a",
    jarId: "jar",
    kind: "transfer",
    transferId: "t",
    amount: money(minor, "LAK"),
    date: "2026-11-01",
    createdAt: "2026-11-01T10:00:00Z",
    note: null,
    otherAccount: null,
    ...rest,
  };
}

describe("jarStatus", () => {
  it("tells owed, owe and paid off", () => {
    expect(jarStatus(money(5, "LAK"))).toBe("owed");
    expect(jarStatus(money(-5, "LAK"))).toBe("owe");
    expect(jarStatus(money(0, "LAK"))).toBe("paid");
  });
});

describe("openJars", () => {
  it("keeps the jars that are not zero", () => {
    const open = jar("LAK", 100);
    expect(openJars(person("Nok", [open, jar("THB", 0)]))).toEqual([open]);
  });
});

describe("isLate", () => {
  it("is late only when the date has passed and money is left", () => {
    expect(isLate(jar("LAK", 100, null), TODAY)).toBe(false);
    expect(isLate(jar("LAK", 100, TODAY), TODAY)).toBe(false);
    expect(isLate(jar("LAK", 0, "2026-11-01"), TODAY)).toBe(false);
    expect(isLate(jar("LAK", 100, "2026-11-23"), TODAY)).toBe(true);
    expect(isLate(jar("LAK", -100, "2026-11-23"), TODAY)).toBe(true);
  });
});

describe("totals", () => {
  it("sums each currency apart and never nets owed against owing", () => {
    const result = totals([
      person("Nok", [jar("LAK", 6000), jar("THB", 500)]),
      person("Kham", [jar("LAK", 25000), jar("THB", -200)]),
      person("Ana", [jar("THB", -300), jar("USD", 0)]),
    ]);
    expect(result.owed).toEqual([money(31000, "LAK"), money(500, "THB")]);
    expect(result.owe).toEqual([money(500, "THB")]);
  });

  it("is empty with nobody", () => {
    expect(totals([])).toEqual({ owed: [], owe: [] });
  });
});

describe("dueLine", () => {
  it("shows the earliest late date first", () => {
    const nok = person("Nok", [
      jar("LAK", 100, "2026-11-20"),
      jar("THB", 100, "2026-11-10"),
      jar("USD", 100, "2026-12-01"),
    ]);
    expect(dueLine(nok, TODAY)).toEqual({ kind: "late", date: "2026-11-10" });
  });

  it("shows the earliest coming date when nothing is late", () => {
    const nok = person("Nok", [
      jar("LAK", 100, "2026-12-30"),
      jar("THB", 100, "2026-11-30"),
      jar("USD", 100),
    ]);
    expect(dueLine(nok, TODAY)).toEqual({ kind: "due", date: "2026-11-30" });
  });

  it("ignores paid-off jars and has nothing without a date", () => {
    expect(
      dueLine(person("Nok", [jar("LAK", 0, "2026-11-01")]), TODAY),
    ).toEqual({ kind: "none" });
    expect(dueLine(person("Nok", [jar("LAK", 100)]), TODAY)).toEqual({
      kind: "none",
    });
  });
});

describe("splitPeople", () => {
  it("puts late people first, then orders by name, and sets paid-off apart", () => {
    const zed = person("Zed", [jar("LAK", 100, "2026-11-01")]);
    const kham = person("Kham", [jar("LAK", 100, "2026-11-02")]);
    const bea = person("Bea", [jar("LAK", 100)]);
    const ana = person("Ana", [jar("LAK", 100, "2026-12-01")]);
    const paidB = person("Bob", [jar("LAK", 0)]);
    const paidA = person("Abe", []);
    const result = splitPeople([bea, zed, paidB, ana, kham, paidA], TODAY);
    expect(result.open.map((p) => p.name)).toEqual([
      "Kham",
      "Zed",
      "Ana",
      "Bea",
    ]);
    expect(result.paidOff.map((p) => p.name)).toEqual(["Abe", "Bob"]);
  });
});

describe("labelEntries", () => {
  it("labels a debt story by the jar's running balance, newest first", () => {
    const rows: JarRow[] = [
      row({ id: "1", minor: 10000, date: "2026-11-01" }),
      row({ id: "2", minor: -4000, date: "2026-11-02" }),
      row({ id: "3", minor: -6000, date: "2026-11-03" }),
      row({ id: "4", minor: -2000, date: "2026-11-04" }),
      row({ id: "5", minor: 2000, date: "2026-11-05" }),
      row({ id: "6", minor: 500, kind: "adjustment", date: "2026-11-06" }),
      row({ id: "7", minor: -500, kind: "expense", date: "2026-11-07" }),
      row({ id: "8", minor: 700, kind: "income", date: "2026-11-08" }),
    ];
    expect(labelEntries(rows).map((entry) => entry.label)).toEqual([
      "forgiven",
      "forgiven",
      "before",
      "you_paid_back",
      "borrowed",
      "paid_back",
      "paid_back",
      "lent",
    ]);
  });

  it("keeps each jar's balance apart", () => {
    const rows: JarRow[] = [
      row({ id: "1", jarId: "kip", minor: 100 }),
      {
        ...row({ id: "2", jarId: "baht", minor: -50 }),
        amount: money(-50, "THB"),
      },
    ];
    expect(labelEntries(rows).map((entry) => entry.label)).toEqual([
      "borrowed",
      "lent",
    ]);
  });

  it("orders the same day by when it was added, then by id", () => {
    const rows: JarRow[] = [
      row({ id: "a", minor: 100, createdAt: "2026-11-01T10:00:00Z" }),
      row({ id: "c", minor: 100, createdAt: "2026-11-01T11:00:00Z" }),
      row({ id: "b", minor: 100, createdAt: "2026-11-01T11:00:00Z" }),
    ];
    expect(labelEntries(rows).map((entry) => entry.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });
});

describe("rateText", () => {
  it("works out how much of the account currency one whole unit is worth", () => {
    expect(rateText(money(50000, "THB"), money(30000000, "LAK"))).toBe(
      "1 ฿ = ₭600",
    );
  });

  it("keeps decimals that matter and rounds the rest", () => {
    expect(rateText(money(300, "USD"), money(1000, "EUR"))).toBe("1 $ = €3.33");
    expect(rateText(money(100000, "LAK"), money(250000, "THB"))).toBe(
      "1 ₭ = ฿2.5",
    );
    expect(rateText(money(100, "THB"), money(250000, "LAK"))).toBe(
      "1 ฿ = ₭2,500",
    );
  });
});
