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
};
const bcelUsd: AccountOption = {
  id: "2",
  name: "BCEL",
  currency: "USD",
  free: money(990, "USD"),
  minimum: money(1000, "USD"),
};
const cash: AccountOption = {
  id: "3",
  name: "Cash",
  currency: "LAK",
  free: null,
  minimum: null,
};

describe("overspendWarning", () => {
  it("gives the numbers for the pop-up when the payment is more than is free", () => {
    expect(overspendWarning(bcelKip, money(7000000, "LAK"), null)).toEqual(
      {
        free: money(6950000, "LAK"),
        minimum: money(50000, "LAK"),
        account: "BCEL",
      },
    );
  });

  it("names the account by its name, since the amounts show the currency", () => {
    expect(
      overspendWarning(bcelUsd, money(991, "USD"), null)?.account,
    ).toBe("BCEL");
  });

  it("gives nothing when the payment is less than the free amount", () => {
    expect(
      overspendWarning(bcelKip, money(100000, "LAK"), null),
    ).toBeNull();
  });

  it("gives nothing when the payment is exactly the free amount", () => {
    expect(
      overspendWarning(bcelKip, money(6950000, "LAK"), null),
    ).toBeNull();
  });

  it("gives nothing for an account without a minimum", () => {
    expect(overspendWarning(cash, money(9999999, "LAK"), null)).toBeNull();
  });

  it("gives nothing when only the minimum is missing", () => {
    const odd = { ...bcelKip, minimum: null };
    expect(overspendWarning(odd, money(9999999, "LAK"), null)).toBeNull();
  });

  it("adds the old amount of an edited entry back before comparing", () => {
    const back = money(100000, "LAK");
    expect(
      overspendWarning(bcelKip, money(7050000, "LAK"), back),
    ).toBeNull();
    expect(overspendWarning(bcelKip, money(7050001, "LAK"), back)).toEqual(
      {
        free: money(7050000, "LAK"),
        minimum: money(50000, "LAK"),
        account: "BCEL",
      },
    );
  });
});
