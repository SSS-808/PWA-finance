import { describe, expect, it } from "vitest";
import { sortByPosition } from "./order";

describe("sortByPosition", () => {
  it("sorts by position", () => {
    const rows = [
      { position: 2, name: "A" },
      { position: 0, name: "C" },
      { position: 1, name: "B" },
    ];
    expect(sortByPosition(rows).map((row) => row.name)).toEqual([
      "C",
      "B",
      "A",
    ]);
  });

  it("breaks ties by name, ignoring upper and lower case", () => {
    const rows = [
      { position: 1, name: "bills" },
      { position: 1, name: "Food" },
      { position: 1, name: "Apple" },
    ];
    expect(sortByPosition(rows).map((row) => row.name)).toEqual([
      "Apple",
      "bills",
      "Food",
    ]);
  });

  it("does not change the input", () => {
    const rows = [
      { position: 1, name: "B" },
      { position: 0, name: "A" },
    ];
    const copy = [...rows];
    const sorted = sortByPosition(rows);
    expect(rows).toEqual(copy);
    expect(sorted).not.toBe(rows);
  });
});
