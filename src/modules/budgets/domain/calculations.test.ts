import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import {
  type BudgetCategory,
  type BudgetChange,
  type BudgetLine,
  type ExpenseRow,
  activeBudgets,
  budgetGroups,
  mostUsedLines,
  usedPercent,
} from "./calculations";

const FOOD = "11111111-1111-4111-8111-111111111111";
const BILLS = "22222222-2222-4222-8222-222222222222";
const GAMES = "33333333-3333-4333-8333-333333333333";

const categories: BudgetCategory[] = [
  { id: FOOD, name: "Food", hidden: false, icon: "utensils", color: "orange" },
  { id: BILLS, name: "Bills", hidden: false, icon: "zap", color: "blue" },
];

function change(
  categoryId: string,
  startMonth: string,
  amountMinor: number,
  currency: BudgetChange["currency"] = "LAK",
): BudgetChange {
  return { categoryId, currency, startMonth, amountMinor };
}

function expense(
  categoryId: string,
  amountMinor: number,
  currency: ExpenseRow["currency"] = "LAK",
): ExpenseRow {
  return { categoryId, currency, amountMinor };
}

describe("activeBudgets", () => {
  it("has nothing without changes", () => {
    expect(activeBudgets([], "2026-10")).toEqual([]);
  });

  it("repeats a budget in every month after it starts", () => {
    const changes = [change(FOOD, "2026-08", 2_000_000)];
    expect(activeBudgets(changes, "2026-08")).toEqual(changes);
    expect(activeBudgets(changes, "2026-10")).toEqual(changes);
    expect(activeBudgets(changes, "2027-02")).toEqual(changes);
  });

  it("ignores a change dated after the month", () => {
    expect(activeBudgets([change(FOOD, "2026-11", 100)], "2026-10")).toEqual(
      [],
    );
  });

  it("lets the latest change at or before the month win, whatever the order", () => {
    const old = change(FOOD, "2026-08", 1_000_000);
    const fresh = change(FOOD, "2026-10", 2_000_000);
    expect(activeBudgets([old, fresh], "2026-09")).toEqual([old]);
    expect(activeBudgets([fresh, old], "2026-09")).toEqual([old]);
    expect(activeBudgets([old, fresh], "2026-10")).toEqual([fresh]);
    expect(activeBudgets([fresh, old], "2026-12")).toEqual([fresh]);
  });

  it("ends a budget from the month of a 0 change, while earlier months keep it", () => {
    const changes = [
      change(FOOD, "2026-08", 1_000_000),
      change(FOOD, "2026-10", 0),
    ];
    expect(activeBudgets(changes, "2026-09")).toHaveLength(1);
    expect(activeBudgets(changes, "2026-10")).toEqual([]);
    expect(activeBudgets(changes, "2026-11")).toEqual([]);
  });

  it("brings a budget back with a later change after a 0", () => {
    const changes = [
      change(FOOD, "2026-08", 1_000_000),
      change(FOOD, "2026-09", 0),
      change(FOOD, "2026-11", 500_000),
    ];
    expect(activeBudgets(changes, "2026-10")).toEqual([]);
    expect(activeBudgets(changes, "2026-11")).toEqual([changes[2]]);
  });

  it("keeps categories and currencies apart", () => {
    const changes = [
      change(FOOD, "2026-08", 100),
      change(FOOD, "2026-08", 500, "USD"),
      change(BILLS, "2026-08", 300),
    ];
    expect(activeBudgets(changes, "2026-10")).toHaveLength(3);
  });
});

describe("usedPercent", () => {
  it("is the whole percent that is used", () => {
    const budget = money(2_000_000, "LAK");
    expect(usedPercent(money(0, "LAK"), budget)).toBe(0);
    expect(usedPercent(money(45_000, "LAK"), budget)).toBe(2);
    expect(usedPercent(money(1_999_999, "LAK"), budget)).toBe(99);
    expect(usedPercent(money(2_000_000, "LAK"), budget)).toBe(100);
    expect(usedPercent(money(5_000_000, "LAK"), budget)).toBe(250);
  });
});

describe("budgetGroups", () => {
  it("has no groups without budgets", () => {
    expect(
      budgetGroups([], [expense(FOOD, -100)], categories, "2026-10"),
    ).toEqual([]);
  });

  it("shows a budget with no spending", () => {
    const groups = budgetGroups(
      [change(FOOD, "2026-10", 2_000_000)],
      [],
      categories,
      "2026-10",
    );
    expect(groups).toEqual([
      {
        currency: "LAK",
        lines: [
          {
            categoryId: FOOD,
            name: "Food",
            hidden: false,
            icon: "utensils",
            color: "orange",
            budget: money(2_000_000, "LAK"),
            spent: money(0, "LAK"),
            left: money(2_000_000, "LAK"),
            percent: 0,
          },
        ],
        budget: money(2_000_000, "LAK"),
        spent: money(0, "LAK"),
        left: money(2_000_000, "LAK"),
        percent: 0,
      },
    ]);
  });

  it("counts expenses as positive spending", () => {
    const [group] = budgetGroups(
      [change(FOOD, "2026-10", 2_000_000)],
      [expense(FOOD, -45_000), expense(FOOD, -5_000)],
      categories,
      "2026-10",
    );
    const line = group?.lines[0];
    expect(line?.spent).toEqual(money(50_000, "LAK"));
    expect(line?.left).toEqual(money(1_950_000, "LAK"));
    expect(line?.percent).toBe(2);
  });

  it("is not over when spending equals the budget", () => {
    const [group] = budgetGroups(
      [change(FOOD, "2026-10", 100)],
      [expense(FOOD, -100)],
      categories,
      "2026-10",
    );
    expect(group?.lines[0]?.left).toEqual(money(0, "LAK"));
    expect(group?.lines[0]?.percent).toBe(100);
  });

  it("goes negative and above 100 percent when over budget", () => {
    const [group] = budgetGroups(
      [change(FOOD, "2026-10", 10_000)],
      [expense(FOOD, -45_000)],
      categories,
      "2026-10",
    );
    expect(group?.lines[0]?.left).toEqual(money(-35_000, "LAK"));
    expect(group?.lines[0]?.percent).toBe(450);
  });

  it("uses the old amount before a change and the new one from it on", () => {
    const changes = [
      change(FOOD, "2026-08", 1_000_000),
      change(FOOD, "2026-10", 2_000_000),
    ];
    const september = budgetGroups(changes, [], categories, "2026-09");
    const october = budgetGroups(changes, [], categories, "2026-10");
    expect(september[0]?.lines[0]?.budget).toEqual(money(1_000_000, "LAK"));
    expect(october[0]?.lines[0]?.budget).toEqual(money(2_000_000, "LAK"));
  });

  it("drops an ended budget from its month on but keeps earlier months", () => {
    const changes = [
      change(FOOD, "2026-08", 1_000_000),
      change(FOOD, "2026-10", 0),
    ];
    expect(budgetGroups(changes, [], categories, "2026-09")).toHaveLength(1);
    expect(budgetGroups(changes, [], categories, "2026-10")).toEqual([]);
  });

  it("ignores a change that starts after the viewed month", () => {
    expect(
      budgetGroups([change(FOOD, "2026-11", 100)], [], categories, "2026-10"),
    ).toEqual([]);
  });

  it("keeps two currencies of one category apart", () => {
    const groups = budgetGroups(
      [
        change(FOOD, "2026-10", 2_000_000),
        change(FOOD, "2026-10", 10_000, "USD"),
      ],
      [expense(FOOD, -45_000), expense(FOOD, -1_250, "USD")],
      categories,
      "2026-10",
    );
    expect(groups.map((group) => group.currency)).toEqual(["LAK", "USD"]);
    expect(groups[0]?.lines[0]?.spent).toEqual(money(45_000, "LAK"));
    expect(groups[1]?.lines[0]?.spent).toEqual(money(1_250, "USD"));
    expect(groups[1]?.lines[0]?.left).toEqual(money(8_750, "USD"));
  });

  it("follows the order of the currency list, not the order of the changes", () => {
    const groups = budgetGroups(
      [change(FOOD, "2026-10", 100, "THB"), change(FOOD, "2026-10", 100)],
      [],
      categories,
      "2026-10",
    );
    expect(groups.map((group) => group.currency)).toEqual(["LAK", "THB"]);
  });

  it("ignores expenses of a category or currency without a budget", () => {
    const [group] = budgetGroups(
      [change(FOOD, "2026-10", 1_000)],
      [expense(BILLS, -500), expense(FOOD, -700, "USD"), expense(FOOD, -200)],
      categories,
      "2026-10",
    );
    expect(group?.lines).toHaveLength(1);
    expect(group?.spent).toEqual(money(200, "LAK"));
  });

  it("keeps the line of a hidden category", () => {
    const [group] = budgetGroups(
      [change(FOOD, "2026-10", 1_000)],
      [],
      [{ id: FOOD, name: "Food", hidden: true, icon: "tag", color: "gray" }],
      "2026-10",
    );
    expect(group?.lines[0]?.hidden).toBe(true);
  });

  it("carries the icon and colour of each category onto its line", () => {
    const [group] = budgetGroups(
      [change(FOOD, "2026-10", 1_000), change(BILLS, "2026-10", 1_000)],
      [],
      categories,
      "2026-10",
    );
    expect(group?.lines.map((line) => [line.icon, line.color])).toEqual([
      ["utensils", "orange"],
      ["zap", "blue"],
    ]);
  });

  it("skips a budget whose category is unknown", () => {
    expect(
      budgetGroups(
        [change(GAMES, "2026-10", 1_000)],
        [],
        categories,
        "2026-10",
      ),
    ).toEqual([]);
  });

  it("keeps the order of the categories list", () => {
    const ordered: BudgetCategory[] = [
      { id: GAMES, name: "Games", hidden: false, icon: "tag", color: "gray" },
      { id: BILLS, name: "Bills", hidden: true, icon: "tag", color: "gray" },
      { id: FOOD, name: "Food", hidden: false, icon: "tag", color: "gray" },
    ];
    const [group] = budgetGroups(
      [
        change(FOOD, "2026-10", 1),
        change(BILLS, "2026-10", 1),
        change(GAMES, "2026-10", 1),
      ],
      [],
      ordered,
      "2026-10",
    );
    expect(group?.lines.map((line) => line.categoryId)).toEqual([
      GAMES,
      BILLS,
      FOOD,
    ]);
  });

  it("adds up the lines for the totals and uses them for the percent", () => {
    const [group] = budgetGroups(
      [change(FOOD, "2026-10", 1_000), change(BILLS, "2026-10", 3_000)],
      [expense(FOOD, -1_500), expense(BILLS, -500)],
      categories,
      "2026-10",
    );
    expect(group?.lines.map((line) => line.name)).toEqual(["Food", "Bills"]);
    expect(group?.budget).toEqual(money(4_000, "LAK"));
    expect(group?.spent).toEqual(money(2_000, "LAK"));
    expect(group?.left).toEqual(money(2_000, "LAK"));
    expect(group?.percent).toBe(50);
  });
});

describe("mostUsedLines", () => {
  function budgetLine(
    categoryId: string,
    name: string,
    percent: number,
  ): BudgetLine {
    return {
      categoryId,
      name,
      hidden: false,
      icon: "tag",
      color: "gray",
      budget: money(100, "LAK"),
      spent: money(percent, "LAK"),
      left: money(100 - percent, "LAK"),
      percent,
    };
  }

  const food = budgetLine(FOOD, "Food", 40);
  const bills = budgetLine(BILLS, "Bills", 80);
  const games = budgetLine(GAMES, "Games", 120);

  it("returns every line when there are fewer than the limit", () => {
    expect(mostUsedLines([food, bills], 3)).toEqual([bills, food]);
  });

  it("returns only the first lines when there are more than the limit", () => {
    expect(mostUsedLines([food, bills, games], 2)).toEqual([games, bills]);
  });

  it("puts an over-budget line first", () => {
    expect(mostUsedLines([bills, games, food], 3)[0]).toBe(games);
  });

  it("breaks a tie by name, then by id", () => {
    const apples = budgetLine(FOOD, "Apples", 50);
    const zebra = budgetLine(BILLS, "Zebra", 50);
    const twinA = budgetLine(FOOD, "Twin", 50);
    const twinB = budgetLine(BILLS, "Twin", 50);
    expect(mostUsedLines([zebra, apples], 2)).toEqual([apples, zebra]);
    expect(mostUsedLines([twinB, twinA], 2)).toEqual([twinA, twinB]);
  });

  it("does not change the input array", () => {
    const input = [food, bills, games];
    mostUsedLines(input, 2);
    expect(input).toEqual([food, bills, games]);
  });
});
