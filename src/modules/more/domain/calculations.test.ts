import { describe, expect, it } from "vitest";
import { budgetsStatus, goalsStatus, tripsStatus } from "./calculations";

describe("budgetsStatus", () => {
  it("says none without budgets", () => {
    expect(budgetsStatus(0, 0)).toEqual({ kind: "none" });
  });

  it("counts the budgets that are over", () => {
    expect(budgetsStatus(3, 2)).toEqual({ kind: "over", count: 2 });
  });

  it("says ok when nothing is over", () => {
    expect(budgetsStatus(3, 0)).toEqual({ kind: "ok" });
  });
});

describe("goalsStatus", () => {
  it("says none without goals", () => {
    expect(goalsStatus(0, 0)).toEqual({ kind: "none" });
  });

  it("shows the progress of a single goal", () => {
    expect(goalsStatus(1, 45)).toEqual({ kind: "one", percent: 45 });
  });

  it("counts several goals", () => {
    expect(goalsStatus(3, 45)).toEqual({ kind: "many", count: 3 });
  });
});

describe("tripsStatus", () => {
  it("prefers the trip that is on", () => {
    expect(tripsStatus(3, "Vietnam", "Laos")).toEqual({
      kind: "now",
      name: "Vietnam",
    });
  });

  it("then the next trip", () => {
    expect(tripsStatus(2, null, "Luang Prabang")).toEqual({
      kind: "next",
      name: "Luang Prabang",
    });
  });

  it("then the count", () => {
    expect(tripsStatus(0, null, null)).toEqual({ kind: "none" });
    expect(tripsStatus(1, null, null)).toEqual({ kind: "one" });
    expect(tripsStatus(4, null, null)).toEqual({ kind: "many", count: 4 });
  });
});
