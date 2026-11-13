import { describe, expect, it } from "vitest";
import { type Money, money, zero } from "@/modules/money";
import {
  biggestExpenses,
  budgetRecords,
  countedMonths,
  fullMonthsOf,
  incomeSources,
  normalMonth,
  orderCurrencies,
  usualByCategory,
} from "./calculations";
import type {
  BudgetEntry,
  CategoryInfo,
  CategoryRow,
  ExpenseItem,
} from "./types";

const usd = (minor: number) => money(minor, "USD");
const info = (name: string): CategoryInfo => ({
  name,
  icon: `${name}-icon`,
  color: "blue",
});
const categories = new Map<string, CategoryInfo>([
  ["food", info("Food")],
  ["bills", info("Bills")],
  ["fun", info("Fun")],
]);
const row = (
  month: string,
  categoryId: string | null,
  minor: number,
  currency: "USD" | "EUR" = "USD",
): CategoryRow => ({ month, categoryId, amount: money(minor, currency) });

describe("fullMonthsOf", () => {
  it("lists the months before the current one, oldest first", () => {
    expect(fullMonthsOf("2026-11", 3)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
  });

  it("crosses a year boundary", () => {
    expect(fullMonthsOf("2026-02", 3)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });

  it("gives as many months as the period", () => {
    expect(fullMonthsOf("2026-11", 12)).toHaveLength(12);
  });
});

describe("countedMonths", () => {
  const full = ["2026-08", "2026-09", "2026-10"];

  it("is empty without a first entry", () => {
    expect(countedMonths(full, null)).toEqual([]);
  });

  it("keeps the months from the first entry on", () => {
    expect(countedMonths(full, "2026-09")).toEqual(["2026-09", "2026-10"]);
    expect(countedMonths(full, "2020-01")).toEqual(full);
    expect(countedMonths(full, "2026-11")).toEqual([]);
  });
});

describe("orderCurrencies", () => {
  it("puts the main currency first, then the usual order, without repeats", () => {
    expect(orderCurrencies(["USD", "THB", "USD", "LAK"], "THB")).toEqual([
      "THB",
      "LAK",
      "USD",
    ]);
  });

  it("skips a main currency that is not used", () => {
    expect(orderCurrencies(["USD"], "LAK")).toEqual(["USD"]);
  });
});

describe("normalMonth", () => {
  it("is null with fewer than two months", () => {
    expect(normalMonth([], "USD")).toBeNull();
    expect(
      normalMonth(
        [{ month: "2026-10", income: usd(100), spending: usd(50) }],
        "USD",
      ),
    ).toBeNull();
  });

  it("averages income and spending", () => {
    expect(
      normalMonth(
        [
          { month: "2026-09", income: usd(1000), spending: usd(400) },
          { month: "2026-10", income: usd(1001), spending: usd(701) },
        ],
        "USD",
      ),
    ).toEqual({
      months: 2,
      income: usd(1001),
      spending: usd(551),
      kept: usd(450),
    });
  });
});

describe("usualByCategory", () => {
  const months = ["2026-09", "2026-10"];

  it("is empty without months", () => {
    expect(
      usualByCategory([row("2026-09", "food", 100)], [], categories, "USD", 5),
    ).toEqual([]);
  });

  it("averages per category, biggest first, with month cells", () => {
    const result = usualByCategory(
      [
        row("2026-09", "food", 300),
        row("2026-10", "food", 201),
        row("2026-10", "bills", 900),
        row("2026-08", "bills", 5000),
        row("2026-10", "bills", 100, "EUR"),
      ],
      months,
      categories,
      "USD",
      5,
    );
    expect(result.map((item) => item.name)).toEqual(["Bills", "Food"]);
    expect(result[1]).toEqual({
      categoryId: "food",
      name: "Food",
      icon: "Food-icon",
      color: "blue",
      average: usd(251),
      byMonth: [usd(300), usd(201)],
    });
    expect(result[0]?.byMonth).toEqual([usd(0), usd(900)]);
  });

  it("breaks ties by name", () => {
    const result = usualByCategory(
      [row("2026-09", "fun", 100), row("2026-09", "bills", 100)],
      months,
      categories,
      "USD",
      5,
    );
    expect(result.map((item) => item.name)).toEqual(["Bills", "Fun"]);
  });

  it("puts the rest, unknown and uncategorised rows into one Other item last", () => {
    const result = usualByCategory(
      [
        row("2026-09", "food", 900),
        row("2026-09", "bills", 300),
        row("2026-10", "bills", 100),
        row("2026-09", "fun", 200),
        row("2026-10", "fun", 50),
        row("2026-10", "gone", 10),
        row("2026-10", null, 20),
      ],
      months,
      categories,
      "USD",
      1,
    );
    expect(result.map((item) => item.categoryId)).toEqual(["food", null]);
    expect(result[1]).toEqual({
      categoryId: null,
      name: "",
      icon: "ellipsis",
      color: "gray",
      average: usd(340),
      byMonth: [usd(500), usd(180)],
    });
  });

  it("leaves out an empty Other item", () => {
    const result = usualByCategory(
      [row("2026-09", "food", 100)],
      months,
      categories,
      "USD",
      5,
    );
    expect(result).toHaveLength(1);
  });
});

describe("incomeSources", () => {
  const months = ["2026-09", "2026-10"];

  it("is empty when there is nothing", () => {
    expect(incomeSources([], months, categories, "USD", 5)).toEqual([]);
  });

  it("gives each source's amount and share, with Other last", () => {
    const result = incomeSources(
      [
        row("2026-09", "food", 600),
        row("2026-10", "food", 200),
        row("2026-10", "bills", 100),
        row("2026-10", "fun", 100),
      ],
      months,
      categories,
      "USD",
      1,
    );
    expect(
      result.map((item) => [item.categoryId, item.amount, item.share]),
    ).toEqual([
      ["food", usd(800), 0.8],
      [null, usd(200), 0.2],
    ]);
  });
});

describe("biggestExpenses", () => {
  const item = (id: string, date: string, minor: number): ExpenseItem => ({
    id,
    date,
    note: null,
    categoryId: null,
    accountId: "a",
    amount: usd(minor),
  });

  it("sorts by amount, then later date, then id, and cuts to the count", () => {
    const items = [
      item("c", "2026-10-01", 100),
      item("b", "2026-10-02", 100),
      item("a", "2026-10-02", 100),
      item("z", "2026-09-01", 500),
    ];
    expect(biggestExpenses(items, 3).map((entry) => entry.id)).toEqual([
      "z",
      "a",
      "b",
    ]);
    expect(items[0]?.id).toBe("c");
  });
});

describe("budgetRecords", () => {
  const months = ["2026-08", "2026-09", "2026-10"];
  const entry = (
    month: string,
    categoryId: string,
    minor: number,
  ): BudgetEntry => ({ month, categoryId, budget: usd(minor) });
  const spent = new Map<string, Money>([
    ["2026-08|food", usd(100)],
    ["2026-09|food", usd(101)],
    ["2026-10|food", usd(50)],
  ]);

  it("is empty without budgets in the months", () => {
    expect(
      budgetRecords([entry("2026-01", "food", 100)], spent, months, categories),
    ).toEqual([]);
  });

  it("marks kept, over and none, and takes the latest budget", () => {
    const result = budgetRecords(
      [
        entry("2026-08", "food", 100),
        entry("2026-09", "food", 100),
        entry("2026-10", "food", 120),
        entry("2026-09", "bills", 500),
        entry("2026-07", "food", 1),
      ],
      spent,
      months,
      categories,
    );
    expect(result.map((record) => record.name)).toEqual(["Bills", "Food"]);
    expect(result[1]).toMatchObject({
      categoryId: "food",
      budget: usd(120),
      months: ["kept", "over", "kept"],
      kept: 2,
      counted: 3,
    });
    expect(result[0]).toMatchObject({
      budget: usd(500),
      months: ["none", "kept", "none"],
      kept: 1,
      counted: 1,
    });
  });

  it("takes the latest budget whatever the order of the entries", () => {
    const [record] = budgetRecords(
      [entry("2026-10", "food", 120), entry("2026-08", "food", 100)],
      spent,
      months,
      categories,
    );
    expect(record?.budget).toEqual(usd(120));
  });

  it("uses a neutral look for an unknown category", () => {
    const [record] = budgetRecords(
      [entry("2026-10", "gone", 100)],
      new Map(),
      months,
      categories,
    );
    expect(record).toMatchObject({ name: "", icon: "tag", color: "gray" });
  });
});

describe("the approved mockup numbers", () => {
  const months = [
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
    "2026-09",
    "2026-10",
  ];
  const k = (thousands: number) => money(thousands * 100_000, "LAK");
  const mockCategories = new Map<string, CategoryInfo>(
    ["Food", "Bills", "Transportation", "Shopping", "Education", "Other"].map(
      (name) => [name, info(name)],
    ),
  );
  const spendingK: Record<string, number[]> = {
    Food: [1500, 1600, 1800, 1550, 1850, 1600],
    Bills: [1000, 1000, 1000, 1000, 1000, 1000],
    Transportation: [650, 700, 750, 700, 800, 720],
    Shopping: [300, 420, 500, 280, 650, 130],
    Education: [150, 150, 150, 150, 150, 150],
    Other: [20, 70, 260, 100, 200, 400],
  };
  const incomeK = [5000, 5000, 5000, 5000, 5000, 5600];
  const expenseRows: CategoryRow[] = Object.entries(spendingK).flatMap(
    ([name, values]) =>
      values.map((value, i) => ({
        month: months[i] ?? "",
        categoryId: name,
        amount: k(value),
      })),
  );

  it("works out the normal month", () => {
    const totals = months.map((month, i) => ({
      month,
      income: k(incomeK[i] ?? 0),
      spending: expenseRows
        .filter((r) => r.month === month)
        .reduce(
          (total, r) => money(total.minor + r.amount.minor, "LAK"),
          zero("LAK"),
        ),
    }));
    const normal = normalMonth(totals, "LAK");
    expect(normal?.income.minor).toBe(510_000_000);
    expect(normal?.spending.minor).toBe(407_500_000);
    expect(normal?.kept.minor).toBe(102_500_000);
  });

  it("works out what usually goes where", () => {
    const usual = usualByCategory(
      expenseRows,
      months,
      mockCategories,
      "LAK",
      5,
    );
    const average = (name: string) =>
      usual.find((item) => item.name === name)?.average.minor;
    expect(average("Food")).toBe(165_000_000);
    expect(average("Shopping")).toBe(38_000_000);
    expect(average("Other")).toBe(17_500_000);
  });

  it("works out how often each budget was kept", () => {
    const spent = new Map(
      expenseRows.map((r) => [`${r.month}|${r.categoryId}`, r.amount]),
    );
    const entries: BudgetEntry[] = [
      ...months.map((month) => ({
        month,
        categoryId: "Food",
        budget: k(1700),
      })),
      ...months.map((month) => ({
        month,
        categoryId: "Shopping",
        budget: k(400),
      })),
      ...months.slice(3).map((month) => ({
        month,
        categoryId: "Transportation",
        budget: k(800),
      })),
    ];
    const records = budgetRecords(entries, spent, months, mockCategories);
    const byName = (name: string) =>
      records.find((record) => record.name === name);
    expect(byName("Food")).toMatchObject({
      kept: 4,
      counted: 6,
      months: ["kept", "kept", "over", "kept", "over", "kept"],
    });
    expect(byName("Shopping")).toMatchObject({ kept: 3, counted: 6 });
    expect(byName("Transportation")).toMatchObject({
      kept: 3,
      counted: 3,
      months: ["none", "none", "none", "kept", "kept", "kept"],
    });
  });
});
