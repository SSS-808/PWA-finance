import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import { displayBalance, groupByCurrency } from "./calculations";

describe("displayBalance", () => {
  it("shows an asset as it is", () => {
    expect(displayBalance("cash", money(150000, "USD"))).toEqual({
      amount: money(150000, "USD"),
      owed: false,
    });
  });

  it("shows a negative asset balance with its minus sign", () => {
    expect(displayBalance("bank", money(-500, "USD"))).toEqual({
      amount: money(-500, "USD"),
      owed: false,
    });
  });

  it("shows a negative debt as a positive amount that is owed", () => {
    expect(displayBalance("credit_card", money(-3000, "USD"))).toEqual({
      amount: money(3000, "USD"),
      owed: true,
    });
  });

  it("shows a positive debt balance as it is", () => {
    expect(displayBalance("loan", money(1000, "USD"))).toEqual({
      amount: money(1000, "USD"),
      owed: false,
    });
  });

  it("shows a zero debt as not owed", () => {
    expect(displayBalance("loan", money(0, "LAK"))).toEqual({
      amount: money(0, "LAK"),
      owed: false,
    });
  });
});

describe("groupByCurrency", () => {
  const cash = {
    name: "Cash",
    currency: "LAK" as const,
    balance: money(1500, "LAK"),
  };
  const kip = {
    name: "BCEL",
    currency: "LAK" as const,
    balance: money(500, "LAK"),
  };
  const visa = {
    name: "Visa",
    currency: "USD" as const,
    balance: money(-3000, "USD"),
  };
  const baht = {
    name: "KBank",
    currency: "THB" as const,
    balance: money(900, "THB"),
  };

  it("groups in the app's currency order, not the input order", () => {
    const groups = groupByCurrency([baht, visa, cash]);
    expect(groups.map((group) => group.currency)).toEqual([
      "LAK",
      "USD",
      "THB",
    ]);
  });

  it("totals each group and keeps its accounts in order", () => {
    const groups = groupByCurrency([cash, visa, kip]);
    expect(groups[0]).toEqual({
      currency: "LAK",
      accounts: [cash, kip],
      total: money(2000, "LAK"),
    });
    expect(groups[1]).toEqual({
      currency: "USD",
      accounts: [visa],
      total: money(-3000, "USD"),
    });
  });

  it("leaves out currencies that have no accounts", () => {
    expect(groupByCurrency([visa]).map((group) => group.currency)).toEqual([
      "USD",
    ]);
  });

  it("returns nothing for no accounts", () => {
    expect(groupByCurrency([])).toEqual([]);
  });
});
