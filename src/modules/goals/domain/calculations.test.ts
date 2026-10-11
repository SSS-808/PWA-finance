import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import { type Goal, goalProgress, sortGoals } from "./calculations";

const TODAY = "2026-10-12";

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "a",
    name: "Laptop",
    target: money(10_000_000, "LAK"),
    saved: money(0, "LAK"),
    deadline: null,
    archived: false,
    ...overrides,
  };
}

function withSaved(minor: number, overrides: Partial<Goal> = {}): Goal {
  return goal({ saved: money(minor, "LAK"), ...overrides });
}

describe("goalProgress percent and left", () => {
  it("is 0 percent with everything left when nothing is saved", () => {
    const result = goalProgress(goal(), TODAY);
    expect(result.percent).toBe(0);
    expect(result.left).toEqual(money(10_000_000, "LAK"));
    expect(result.reached).toBe(false);
  });

  it("rounds the percent down part way", () => {
    const result = goalProgress(withSaved(3_333_333), TODAY);
    expect(result.percent).toBe(33);
    expect(result.left).toEqual(money(6_666_667, "LAK"));
    expect(result.reached).toBe(false);
  });

  it("is reached at exactly 100 percent", () => {
    const result = goalProgress(withSaved(10_000_000), TODAY);
    expect(result.percent).toBe(100);
    expect(result.left).toEqual(money(0, "LAK"));
    expect(result.reached).toBe(true);
  });

  it("goes above 100 percent but never leaves a negative amount", () => {
    const result = goalProgress(withSaved(15_000_000), TODAY);
    expect(result.percent).toBe(150);
    expect(result.left).toEqual(money(0, "LAK"));
    expect(result.reached).toBe(true);
  });

  it("keeps the goal's currency", () => {
    const usd = goal({
      target: money(10_000, "USD"),
      saved: money(2_500, "USD"),
    });
    const result = goalProgress(usd, TODAY);
    expect(result.percent).toBe(25);
    expect(result.left).toEqual(money(7_500, "USD"));
  });
});

describe("goalProgress deadline", () => {
  it("has no months or monthly amount without a deadline", () => {
    const result = goalProgress(goal(), TODAY);
    expect(result.overdue).toBe(false);
    expect(result.monthsLeft).toBeNull();
    expect(result.perMonth).toBeNull();
  });

  it("counts 1 month for a deadline later this month", () => {
    const result = goalProgress(goal({ deadline: "2026-10-31" }), TODAY);
    expect(result.monthsLeft).toBe(1);
    expect(result.perMonth).toEqual(money(10_000_000, "LAK"));
  });

  it("counts 1 month for a deadline today", () => {
    const result = goalProgress(goal({ deadline: TODAY }), TODAY);
    expect(result.overdue).toBe(false);
    expect(result.monthsLeft).toBe(1);
  });

  it("counts calendar months for a later month", () => {
    const result = goalProgress(goal({ deadline: "2026-12-01" }), TODAY);
    expect(result.monthsLeft).toBe(3);
    expect(result.perMonth).toEqual(money(3_333_334, "LAK"));
  });

  it("counts calendar months across a year", () => {
    const result = goalProgress(goal({ deadline: "2027-03-31" }), TODAY);
    expect(result.monthsLeft).toBe(6);
    expect(result.perMonth).toEqual(money(1_666_667, "LAK"));
  });

  it("rounds the monthly amount up to a whole minor unit", () => {
    const rounded = goal({ target: money(10, "LAK"), deadline: "2026-12-31" });
    expect(goalProgress(rounded, TODAY).perMonth).toEqual(money(4, "LAK"));
    const even = goal({ target: money(9, "LAK"), deadline: "2026-12-31" });
    expect(goalProgress(even, TODAY).perMonth).toEqual(money(3, "LAK"));
  });

  it("uses what is left, not the whole target", () => {
    const result = goalProgress(
      withSaved(4_000_000, { deadline: "2026-12-31" }),
      TODAY,
    );
    expect(result.monthsLeft).toBe(3);
    expect(result.perMonth).toEqual(money(2_000_000, "LAK"));
  });

  it("has no monthly amount once reached, even with a deadline", () => {
    const result = goalProgress(
      withSaved(10_000_000, { deadline: "2026-12-31" }),
      TODAY,
    );
    expect(result.reached).toBe(true);
    expect(result.overdue).toBe(false);
    expect(result.monthsLeft).toBeNull();
    expect(result.perMonth).toBeNull();
  });

  it("is overdue when the deadline has passed and it is not reached", () => {
    const result = goalProgress(
      withSaved(1_000_000, { deadline: "2026-10-11" }),
      TODAY,
    );
    expect(result.overdue).toBe(true);
    expect(result.monthsLeft).toBeNull();
    expect(result.perMonth).toBeNull();
  });

  it("is not overdue when it was reached before the deadline passed", () => {
    const result = goalProgress(
      withSaved(10_000_000, { deadline: "2026-01-01" }),
      TODAY,
    );
    expect(result.overdue).toBe(false);
    expect(result.reached).toBe(true);
  });
});

describe("sortGoals", () => {
  it("puts the soonest deadline first and no deadline last", () => {
    const sorted = sortGoals([
      goal({ id: "1", name: "A none" }),
      goal({ id: "2", name: "B late", deadline: "2027-05-01" }),
      goal({ id: "3", name: "C soon", deadline: "2026-11-01" }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["3", "2", "1"]);
  });

  it("puts the sooner deadline first whichever way round the pair comes", () => {
    const sooner = goal({ id: "1", name: "B", deadline: "2026-11-01" });
    const later = goal({ id: "2", name: "A", deadline: "2026-12-01" });
    expect(sortGoals([sooner, later]).map((item) => item.id)).toEqual([
      "1",
      "2",
    ]);
    expect(sortGoals([later, sooner]).map((item) => item.id)).toEqual([
      "1",
      "2",
    ]);
  });

  it("puts no deadline last whichever way round the pair comes", () => {
    const withDeadline = goal({ id: "1", name: "B", deadline: "2026-11-01" });
    const without = goal({ id: "2", name: "A" });
    expect(sortGoals([withDeadline, without]).map((item) => item.id)).toEqual([
      "1",
      "2",
    ]);
    expect(sortGoals([without, withDeadline]).map((item) => item.id)).toEqual([
      "1",
      "2",
    ]);
  });

  it("sorts goals with the same deadline by name", () => {
    const sorted = sortGoals([
      goal({ id: "1", name: "Zebra", deadline: "2026-11-01" }),
      goal({ id: "2", name: "apple", deadline: "2026-11-01" }),
      goal({ id: "3", name: "Mango" }),
      goal({ id: "4", name: "Kiwi" }),
    ]);
    expect(sorted.map((item) => item.name)).toEqual([
      "apple",
      "Zebra",
      "Kiwi",
      "Mango",
    ]);
  });

  it("keeps archived goals after active ones", () => {
    const sorted = sortGoals([
      goal({ id: "1", name: "Old", deadline: "2026-01-01", archived: true }),
      goal({ id: "2", name: "New" }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["2", "1"]);
  });

  it("falls back to the id when name and deadline match", () => {
    const sorted = sortGoals([
      goal({ id: "b", name: "Same", archived: true }),
      goal({ id: "a", name: "Same", archived: true }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("does not change the list it is given", () => {
    const list = [goal({ id: "2", name: "B" }), goal({ id: "1", name: "A" })];
    sortGoals(list);
    expect(list.map((item) => item.id)).toEqual(["2", "1"]);
  });
});
