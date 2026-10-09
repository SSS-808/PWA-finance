import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import {
  type HistoryItem,
  type HistoryRow,
  groupByDay,
  toHistoryItems,
} from "./history";

function row(overrides: Partial<HistoryRow>): HistoryRow {
  return {
    id: "row",
    kind: "expense",
    transferId: null,
    date: "2026-10-09",
    createdAt: "2026-10-09T08:00:00+00:00",
    accountName: "Cash",
    categoryName: "Food",
    note: null,
    amount: money(-45000, "LAK"),
    ...overrides,
  };
}

function item(overrides: Partial<HistoryItem> & { id: string }): HistoryItem {
  return {
    kind: "expense",
    date: "2026-10-09",
    createdAt: "2026-10-09T08:00:00+00:00",
    accountName: "Cash",
    categoryName: "Food",
    note: null,
    amount: money(-1, "LAK"),
    ...overrides,
  } as HistoryItem;
}

describe("toHistoryItems", () => {
  it("turns every other row into one item", () => {
    const rows = [
      row({ id: "a", note: "Lunch" }),
      row({ id: "b", kind: "income", amount: money(8000000, "LAK") }),
      row({
        id: "c",
        kind: "opening_balance",
        categoryName: null,
        amount: money(1500000, "LAK"),
      }),
      row({ id: "d", kind: "adjustment", categoryName: null }),
    ];
    expect(toHistoryItems(rows)).toEqual([
      {
        id: "a",
        kind: "expense",
        date: "2026-10-09",
        createdAt: "2026-10-09T08:00:00+00:00",
        accountName: "Cash",
        categoryName: "Food",
        note: "Lunch",
        amount: money(-45000, "LAK"),
      },
      expect.objectContaining({ id: "b", kind: "income" }),
      expect.objectContaining({
        id: "c",
        kind: "opening_balance",
        categoryName: null,
      }),
      expect.objectContaining({ id: "d", kind: "adjustment" }),
    ]);
  });

  it("merges the two legs of a transfer into one item", () => {
    const rows = [
      row({
        id: "in",
        kind: "transfer",
        transferId: "t1",
        accountName: "Cash",
        categoryName: null,
        note: "ATM",
        amount: money(500000, "LAK"),
      }),
      row({ id: "x", note: "Between" }),
      row({
        id: "out",
        kind: "transfer",
        transferId: "t1",
        accountName: "BCEL",
        categoryName: null,
        note: "ATM",
        amount: money(-500000, "LAK"),
      }),
    ];
    expect(toHistoryItems(rows)).toEqual([
      {
        id: "t1",
        kind: "transfer",
        date: "2026-10-09",
        createdAt: "2026-10-09T08:00:00+00:00",
        from: "BCEL",
        to: "Cash",
        fromAmount: money(-500000, "LAK"),
        toAmount: money(500000, "LAK"),
        note: "ATM",
      },
      expect.objectContaining({ id: "x", kind: "expense" }),
    ]);
  });

  it("keeps both amounts when an exchange has two currencies", () => {
    const items = toHistoryItems([
      row({
        id: "out",
        kind: "transfer",
        transferId: "t2",
        accountName: "USD Cash",
        categoryName: null,
        amount: money(-10000, "USD"),
      }),
      row({
        id: "in",
        kind: "transfer",
        transferId: "t2",
        accountName: "Cash",
        categoryName: null,
        amount: money(2150000, "LAK"),
      }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "transfer",
      from: "USD Cash",
      to: "Cash",
      fromAmount: money(-10000, "USD"),
      toAmount: money(2150000, "LAK"),
      note: null,
    });
  });

  it("takes the note from whichever leg has one", () => {
    const items = toHistoryItems([
      row({
        id: "out",
        kind: "transfer",
        transferId: "t3",
        amount: money(-5, "LAK"),
      }),
      row({
        id: "in",
        kind: "transfer",
        transferId: "t3",
        note: "Second leg",
        amount: money(5, "LAK"),
      }),
    ]);
    expect(items[0]).toMatchObject({ note: "Second leg" });
  });

  it("shows a transfer with only one leg as a single row", () => {
    const outOnly = toHistoryItems([
      row({
        id: "out",
        kind: "transfer",
        transferId: "t4",
        accountName: "BCEL",
        amount: money(-5, "LAK"),
      }),
    ]);
    expect(outOnly).toEqual([
      expect.objectContaining({
        kind: "transfer",
        from: "BCEL",
        to: null,
        fromAmount: money(-5, "LAK"),
        toAmount: null,
      }),
    ]);

    const inOnly = toHistoryItems([
      row({
        id: "in",
        kind: "transfer",
        transferId: "t5",
        accountName: "Cash",
        amount: money(5, "LAK"),
      }),
    ]);
    expect(inOnly).toEqual([
      expect.objectContaining({
        from: null,
        to: "Cash",
        fromAmount: null,
        toAmount: money(5, "LAK"),
      }),
    ]);
  });

  it("treats a transfer row without a transfer id as its own transfer", () => {
    const items = toHistoryItems([
      row({ id: "lonely", kind: "transfer", amount: money(-5, "LAK") }),
    ]);
    expect(items).toEqual([expect.objectContaining({ id: "lonely" })]);
  });

  it("is empty for no rows", () => {
    expect(toHistoryItems([])).toEqual([]);
  });
});

describe("groupByDay", () => {
  it("groups by day, newest day first", () => {
    const days = groupByDay([
      item({ id: "old", date: "2026-10-07" }),
      item({ id: "new", date: "2026-10-09" }),
      item({ id: "mid", date: "2026-10-08" }),
    ]);
    expect(days.map((day) => day.date)).toEqual([
      "2026-10-09",
      "2026-10-08",
      "2026-10-07",
    ]);
  });

  it("puts the newest entry first inside a day", () => {
    const days = groupByDay([
      item({ id: "early", createdAt: "2026-10-09T08:00:00+00:00" }),
      item({ id: "late", createdAt: "2026-10-09T20:00:00.5+00:00" }),
      item({ id: "mid", createdAt: "2026-10-09T12:00:00+00:00" }),
    ]);
    expect(days).toHaveLength(1);
    expect(days[0]?.items.map((entry) => entry.id)).toEqual([
      "late",
      "mid",
      "early",
    ]);
  });

  it("sorts by the entry time even when the input order differs", () => {
    const days = groupByDay([
      item({
        id: "a",
        date: "2026-10-08",
        createdAt: "2026-10-08T09:00:00+00:00",
      }),
      item({
        id: "b",
        date: "2026-10-09",
        createdAt: "2026-10-09T09:00:00+00:00",
      }),
      item({
        id: "c",
        date: "2026-10-08",
        createdAt: "2026-10-08T18:00:00+00:00",
      }),
    ]);
    expect(
      days.map((day) => [day.date, day.items.map((entry) => entry.id)]),
    ).toEqual([
      ["2026-10-09", ["b"]],
      ["2026-10-08", ["c", "a"]],
    ]);
  });

  it("keeps the input order for entries with the same time", () => {
    const days = groupByDay([item({ id: "first" }), item({ id: "second" })]);
    expect(days[0]?.items.map((entry) => entry.id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("does not change the list it was given", () => {
    const list = [
      item({ id: "a", date: "2026-10-01" }),
      item({ id: "b", date: "2026-10-02" }),
    ];
    groupByDay(list);
    expect(list.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("is empty for no items", () => {
    expect(groupByDay([])).toEqual([]);
  });
});
