import { describe, expect, it } from "vitest";
import {
  baseFilters,
  escapeLike,
  filtersToQuery,
  monthRange,
  nextMonth,
  parseFilters,
  previousMonth,
} from "./filters";

const TODAY = "2026-10-10";
const ID = "0b3f7a2e-5c1d-4e8a-9f60-1a2b3c4d5e6f";

describe("parseFilters", () => {
  it("uses the current month and no other filter when nothing is given", () => {
    expect(parseFilters({}, TODAY)).toEqual(baseFilters("2026-10"));
  });

  it("reads every filter that is good", () => {
    const filters = parseFilters(
      { month: "2026-02", account: ID, category: ID, type: "other", q: "taxi" },
      TODAY,
    );
    expect(filters).toEqual({
      month: "2026-02",
      accountId: ID,
      categoryId: ID,
      type: "other",
      q: "taxi",
    });
  });

  it("reads month=all as every month", () => {
    expect(parseFilters({ month: "all" }, TODAY).month).toBeNull();
  });

  it.each(["2026-13", "2026-00", "2026-1", "1999-12", "abc", "", "all "])(
    "falls back to the current month for month=%j",
    (month) => {
      expect(parseFilters({ month }, TODAY).month).toBe("2026-10");
    },
  );

  it("falls back to the current month for repeated or missing month", () => {
    expect(parseFilters({ month: ["2026-01", "2026-02"] }, TODAY).month).toBe(
      "2026-10",
    );
    expect(parseFilters({ month: undefined }, TODAY).month).toBe("2026-10");
  });

  it("ignores an account or category that is not a uuid", () => {
    const filters = parseFilters({ account: "nope", category: [ID] }, TODAY);
    expect(filters.accountId).toBeNull();
    expect(filters.categoryId).toBeNull();
  });

  it.each(["expense", "income", "transfer", "other"] as const)(
    "reads type=%s",
    (type) => {
      expect(parseFilters({ type }, TODAY).type).toBe(type);
    },
  );

  it("ignores a type it does not know", () => {
    expect(parseFilters({ type: "opening_balance" }, TODAY).type).toBeNull();
    expect(parseFilters({ type: "" }, TODAY).type).toBeNull();
  });

  it("trims the search and ignores an empty or missing one", () => {
    expect(parseFilters({ q: "  taxi " }, TODAY).q).toBe("taxi");
    expect(parseFilters({ q: "   " }, TODAY).q).toBe("");
    expect(parseFilters({}, TODAY).q).toBe("");
  });

  it("accepts a search of 100 characters and ignores a longer one", () => {
    expect(parseFilters({ q: "a".repeat(100) }, TODAY).q).toHaveLength(100);
    expect(parseFilters({ q: "a".repeat(101) }, TODAY).q).toBe("");
  });

  it("ignores a repeated search", () => {
    expect(parseFilters({ q: ["a", "b"] }, TODAY).q).toBe("");
  });
});

describe("month maths", () => {
  it("steps back and forward inside a year", () => {
    expect(previousMonth("2026-10")).toBe("2026-09");
    expect(nextMonth("2026-10")).toBe("2026-11");
  });

  it("crosses a year boundary in both directions", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(nextMonth("2025-12")).toBe("2026-01");
  });

  it("gives the first day of the month and of the next one", () => {
    expect(monthRange("2026-10")).toEqual({
      from: "2026-10-01",
      to: "2026-11-01",
    });
    expect(monthRange("2026-12")).toEqual({
      from: "2026-12-01",
      to: "2027-01-01",
    });
  });
});

describe("escapeLike", () => {
  it("escapes the three characters that mean something in a pattern", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });

  it("leaves plain text alone", () => {
    expect(escapeLike("taxi to airport")).toBe("taxi to airport");
  });
});

describe("filtersToQuery", () => {
  it("writes only the month when nothing else is set", () => {
    expect(filtersToQuery(baseFilters("2026-10"))).toBe("month=2026-10");
    expect(filtersToQuery(baseFilters(null))).toBe("month=all");
  });

  it("round-trips through parseFilters", () => {
    const filters = {
      month: null,
      accountId: ID,
      categoryId: ID,
      type: "income" as const,
      q: "50% off & more",
    };
    const query = Object.fromEntries(
      new URLSearchParams(filtersToQuery(filters)),
    );
    expect(parseFilters(query, TODAY)).toEqual(filters);
  });
});
