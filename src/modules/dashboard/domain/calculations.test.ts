import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import {
  emptySummary,
  monthSummary,
  savingsRate,
  type SummaryRow,
} from "./calculations";

const names = new Map([
  ["food", "Food"],
  ["bills", "Bills"],
  ["fun", "Fun"],
  ["trip", "Trip"],
  ["gym", "Gym"],
  ["tea", "Tea"],
  ["gift", "Gift"],
  ["pay", "Salary"],
]);

function lak(kind: string, minor: number, categoryId: string | null = null) {
  return { kind, amount: money(minor, "LAK"), categoryId } satisfies SummaryRow;
}

function spend(categoryId: string | null, minor: number): SummaryRow {
  return lak("expense", -minor, categoryId);
}

describe("savingsRate", () => {
  it("is null without income", () => {
    expect(savingsRate(money(0, "LAK"), money(500, "LAK"))).toBeNull();
  });

  it("is the whole percent of income that was kept", () => {
    expect(savingsRate(money(8_000_000, "LAK"), money(395_000, "LAK"))).toBe(
      95,
    );
  });

  it("is negative when spending is higher than income", () => {
    expect(savingsRate(money(1000, "LAK"), money(1500, "LAK"))).toBe(-50);
  });

  it("never gives -0", () => {
    expect(savingsRate(money(1000, "LAK"), money(1002, "LAK"))).toBe(0);
  });
});

describe("emptySummary", () => {
  it("has zero amounts and no rate", () => {
    expect(emptySummary("USD")).toEqual({
      currency: "USD",
      income: money(0, "USD"),
      spending: money(0, "USD"),
      saved: money(0, "USD"),
      savingsRate: null,
      byCategory: [],
    });
  });
});

describe("monthSummary", () => {
  it("is empty without rows", () => {
    expect(monthSummary([], names)).toEqual([]);
  });

  it("adds up income, spending and what was saved", () => {
    const [summary] = monthSummary(
      [
        lak("income", 8_000_000, "pay"),
        spend("food", 45_000),
        spend("bills", 350_000),
      ],
      names,
    );
    expect(summary).toMatchObject({
      currency: "LAK",
      income: money(8_000_000, "LAK"),
      spending: money(395_000, "LAK"),
      saved: money(7_605_000, "LAK"),
      savingsRate: 95,
    });
  });

  it("ignores transfers, starting amounts and balance fixes", () => {
    const summaries = monthSummary(
      [
        lak("income", 1000, "pay"),
        lak("transfer", -500),
        lak("transfer", 500),
        lak("opening_balance", 9000),
        lak("adjustment", -300),
      ],
      names,
    );
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      income: money(1000, "LAK"),
      spending: money(0, "LAK"),
      saved: money(1000, "LAK"),
      savingsRate: 100,
      byCategory: [],
    });
  });

  it("gives no entry for a currency that only has ignored rows", () => {
    expect(
      monthSummary([lak("transfer", 500), lak("opening_balance", 9000)], names),
    ).toEqual([]);
  });

  it("keeps currencies apart, in the app's currency order", () => {
    const summaries = monthSummary(
      [
        { kind: "expense", amount: money(-250, "USD"), categoryId: "food" },
        lak("income", 5000, "pay"),
        { kind: "income", amount: money(1000, "USD"), categoryId: "pay" },
        spend("food", 1000),
      ],
      names,
    );
    expect(summaries.map((summary) => summary.currency)).toEqual([
      "LAK",
      "USD",
    ]);
    expect(summaries[0]).toMatchObject({
      income: money(5000, "LAK"),
      spending: money(1000, "LAK"),
      savingsRate: 80,
    });
    expect(summaries[1]).toMatchObject({
      income: money(1000, "USD"),
      spending: money(250, "USD"),
      saved: money(750, "USD"),
      savingsRate: 75,
    });
  });

  it("has a null rate with spending but no income, and a negative one when spending is higher", () => {
    const [noIncome] = monthSummary([spend("food", 100)], names);
    expect(noIncome).toMatchObject({
      saved: money(-100, "LAK"),
      savingsRate: null,
    });
    const [over] = monthSummary(
      [lak("income", 1000, "pay"), spend("food", 1500)],
      names,
    );
    expect(over).toMatchObject({
      saved: money(-500, "LAK"),
      savingsRate: -50,
    });
  });

  it("groups spending by category, largest first, with its share", () => {
    const [summary] = monthSummary(
      [
        spend("food", 100),
        spend("bills", 300),
        spend("food", 100),
        lak("income", 5000, "pay"),
      ],
      names,
    );
    expect(summary?.byCategory).toEqual([
      {
        categoryId: "bills",
        name: "Bills",
        amount: money(300, "LAK"),
        share: 0.6,
      },
      {
        categoryId: "food",
        name: "Food",
        amount: money(200, "LAK"),
        share: 0.4,
      },
    ]);
  });

  it("shows the top 5 and puts the rest in Other", () => {
    const [summary] = monthSummary(
      [
        spend("bills", 600),
        spend("food", 500),
        spend("fun", 400),
        spend("trip", 300),
        spend("gym", 200),
        spend("tea", 60),
        spend("gift", 40),
      ],
      names,
    );
    expect(summary?.byCategory.map((item) => item.categoryId)).toEqual([
      "bills",
      "food",
      "fun",
      "trip",
      "gym",
      null,
    ]);
    expect(summary?.byCategory.at(-1)).toEqual({
      categoryId: null,
      name: "",
      amount: money(100, "LAK"),
      share: 100 / 2100,
    });
  });

  it("keeps exactly 5 categories without an Other bucket", () => {
    const [summary] = monthSummary(
      [
        spend("bills", 5),
        spend("food", 4),
        spend("fun", 3),
        spend("trip", 2),
        spend("gym", 1),
      ],
      names,
    );
    expect(summary?.byCategory).toHaveLength(5);
  });

  it("orders equal amounts by name", () => {
    const [summary] = monthSummary(
      [spend("tea", 100), spend("food", 100), spend("bills", 100)],
      names,
    );
    expect(summary?.byCategory.map((item) => item.name)).toEqual([
      "Bills",
      "Food",
      "Tea",
    ]);
  });

  it("counts an expense without a known category as Other", () => {
    const [summary] = monthSummary(
      [spend(null, 100), spend("deleted-category", 50), spend("food", 350)],
      names,
    );
    expect(summary?.byCategory).toEqual([
      {
        categoryId: "food",
        name: "Food",
        amount: money(350, "LAK"),
        share: 0.7,
      },
      {
        categoryId: null,
        name: "",
        amount: money(150, "LAK"),
        share: 0.3,
      },
    ]);
  });
});
