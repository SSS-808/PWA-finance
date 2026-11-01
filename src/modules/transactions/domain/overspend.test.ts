import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import { overspendWarning } from "./overspend";
import type { AccountOption } from "./types";

const bcelKip: AccountOption = {
  id: "1",
  name: "BCEL",
  currency: "LAK",
  free: money(6950000, "LAK"),
  minimum: money(50000, "LAK"),
  setAside: null,
  goals: [],
};
const bcelUsd: AccountOption = {
  id: "2",
  name: "BCEL",
  currency: "USD",
  free: money(990, "USD"),
  minimum: money(1000, "USD"),
  setAside: null,
  goals: [],
};
const cash: AccountOption = {
  id: "3",
  name: "Cash",
  currency: "LAK",
  free: null,
  minimum: null,
  setAside: null,
  goals: [],
};
const withGoals: AccountOption = {
  id: "4",
  name: "KBank",
  currency: "LAK",
  free: money(5000000, "LAK"),
  minimum: money(50000, "LAK"),
  setAside: money(2000000, "LAK"),
  goals: [{ name: "Laptop" }, { name: "Trip" }],
};

describe("overspendWarning", () => {
  it("gives the numbers for the pop-up when the payment is more than is free", () => {
    expect(overspendWarning(bcelKip, money(7000000, "LAK"), null)).toEqual({
      free: money(6950000, "LAK"),
      minimum: money(50000, "LAK"),
      account: "BCEL",
      aside: null,
      goals: [],
    });
  });

  it("names the account by its name, since the amounts show the currency", () => {
    expect(overspendWarning(bcelUsd, money(991, "USD"), null)?.account).toBe(
      "BCEL",
    );
  });

  it("gives nothing when the payment is less than the free amount", () => {
    expect(overspendWarning(bcelKip, money(100000, "LAK"), null)).toBeNull();
  });

  it("gives nothing when the payment is exactly the free amount", () => {
    expect(overspendWarning(bcelKip, money(6950000, "LAK"), null)).toBeNull();
  });

  it("gives nothing for an account that shows no free to spend", () => {
    expect(overspendWarning(cash, money(9999999, "LAK"), null)).toBeNull();
  });

  it("adds the old amount of an edited entry back before comparing", () => {
    const back = money(100000, "LAK");
    expect(overspendWarning(bcelKip, money(7050000, "LAK"), back)).toBeNull();
    expect(overspendWarning(bcelKip, money(7050001, "LAK"), back)).toEqual({
      free: money(7050000, "LAK"),
      minimum: money(50000, "LAK"),
      account: "BCEL",
      aside: null,
      goals: [],
    });
  });

  it("adds the money set aside and the goals holding it", () => {
    expect(overspendWarning(withGoals, money(5000001, "LAK"), null)).toEqual({
      free: money(5000000, "LAK"),
      minimum: money(50000, "LAK"),
      account: "KBank",
      aside: money(2000000, "LAK"),
      goals: ["Laptop", "Trip"],
    });
  });

  it("warns for an account that only has goal money, with a minimum of 0", () => {
    const onlyGoals: AccountOption = {
      ...withGoals,
      minimum: null,
      goals: [{ name: "Laptop" }],
    };
    expect(overspendWarning(onlyGoals, money(5000001, "LAK"), null)).toEqual({
      free: money(5000000, "LAK"),
      minimum: money(0, "LAK"),
      account: "KBank",
      aside: money(2000000, "LAK"),
      goals: ["Laptop"],
    });
  });

  it("gives no set-aside amount when it is 0", () => {
    const empty: AccountOption = { ...bcelKip, setAside: money(0, "LAK") };
    expect(
      overspendWarning(empty, money(7000000, "LAK"), null)?.aside,
    ).toBeNull();
  });
});
