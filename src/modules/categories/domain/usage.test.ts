import { describe, expect, it } from "vitest";
import { countUsage, sortByUsage } from "./usage";

const food = { id: "1", name: "Food" };
const bills = { id: "2", name: "bills" };
const travel = { id: "3", name: "Travel" };
const other = { id: "4", name: "Other" };

describe("countUsage", () => {
  it("counts each category and skips rows without one", () => {
    expect(countUsage(["1", "2", "1", null, "1"])).toEqual(
      new Map([
        ["1", 3],
        ["2", 1],
      ]),
    );
  });

  it("is empty for no rows", () => {
    expect(countUsage([])).toEqual(new Map());
  });
});

describe("sortByUsage", () => {
  it("puts the most used first", () => {
    const usage = new Map([
      ["3", 5],
      ["1", 2],
    ]);
    expect(sortByUsage([food, bills, travel], usage)).toEqual([
      travel,
      food,
      bills,
    ]);
  });

  it("puts unused categories after used ones", () => {
    const usage = new Map([["4", 1]]);
    expect(sortByUsage([food, other], usage)).toEqual([other, food]);
  });

  it("breaks ties alphabetically, ignoring case", () => {
    expect(sortByUsage([travel, food, other, bills], new Map())).toEqual([
      bills,
      food,
      other,
      travel,
    ]);
  });

  it("does not change the list it was given", () => {
    const list = [travel, food];
    sortByUsage(list, new Map());
    expect(list).toEqual([travel, food]);
  });
});
