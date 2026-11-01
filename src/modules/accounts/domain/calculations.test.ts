import { describe, expect, it } from "vitest";
import { money } from "@/modules/money";
import {
  defaultMinimum,
  displayBalance,
  freeToSpend,
  groupByCurrency,
  groupByName,
  sameNameOthers,
  showsFree,
} from "./calculations";

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

describe("groupByName", () => {
  const bcelKip = { id: "1", name: "BCEL", currency: "LAK" as const };
  const bcelUsd = { id: "2", name: "bcel", currency: "USD" as const };
  const bcelThb = { id: "3", name: "BCEL", currency: "THB" as const };
  const cash = { id: "4", name: "Cash", currency: "LAK" as const };
  const apple = { id: "5", name: "apple", currency: "USD" as const };

  it("puts accounts with the same name in one group, ignoring capitals", () => {
    expect(groupByName([bcelKip, bcelUsd])).toEqual([
      { name: "BCEL", accounts: [bcelKip, bcelUsd] },
    ]);
  });

  it("uses the first account's spelling as the group's name", () => {
    expect(groupByName([bcelUsd, bcelKip]).map((group) => group.name)).toEqual([
      "bcel",
    ]);
    expect(groupByName([bcelKip, bcelUsd]).map((group) => group.name)).toEqual([
      "BCEL",
    ]);
  });

  it("keeps each group's accounts in the app's currency order", () => {
    const groups = groupByName([bcelThb, bcelUsd, bcelKip]);
    expect(
      groups.map((group) => group.accounts.map((account) => account.currency)),
    ).toEqual([["LAK", "USD", "THB"]]);
  });

  it("sorts the groups by name, ignoring capitals", () => {
    expect(
      groupByName([cash, bcelKip, apple]).map((group) => group.name),
    ).toEqual(["apple", "BCEL", "Cash"]);
  });

  it("returns nothing for no accounts", () => {
    expect(groupByName([])).toEqual([]);
  });

  it("does not change the list it is given", () => {
    const input = [bcelThb, bcelKip];
    groupByName(input);
    expect(input).toEqual([bcelThb, bcelKip]);
  });
});

describe("sameNameOthers", () => {
  const bcelKip = { id: "1", name: "BCEL" };
  const bcelUsd = { id: "2", name: "bcel" };
  const cash = { id: "3", name: "Cash" };

  it("lists the other accounts with the same name, ignoring capitals", () => {
    expect(sameNameOthers(bcelKip, [bcelKip, bcelUsd, cash])).toEqual([
      bcelUsd,
    ]);
  });

  it("leaves out the account itself", () => {
    expect(sameNameOthers(cash, [bcelKip, cash])).toEqual([]);
  });

  it("returns nothing when no account shares the name", () => {
    expect(sameNameOthers(cash, [])).toEqual([]);
  });
});

describe("defaultMinimum", () => {
  it.each([
    ["LAK", 50000],
    ["USD", 1000],
    ["THB", 50000],
  ] as const)("gives a bank account the usual %s amount", (currency, minor) => {
    expect(defaultMinimum("bank", currency)).toEqual(money(minor, currency));
  });

  it.each([
    "cash",
    "savings",
    "credit_card",
    "loan",
    "investment",
    "other",
  ] as const)("gives %s nothing", (type) => {
    expect(defaultMinimum(type, "USD")).toEqual(money(0, "USD"));
  });
});

describe("freeToSpend", () => {
  it("takes the minimum off the balance", () => {
    expect(
      freeToSpend(money(7000000, "LAK"), money(50000, "LAK"), money(0, "LAK")),
    ).toEqual(money(6950000, "LAK"));
  });

  it("also takes off the money set aside for goals", () => {
    expect(
      freeToSpend(
        money(7000000, "LAK"),
        money(50000, "LAK"),
        money(1000000, "LAK"),
      ),
    ).toEqual(money(5950000, "LAK"));
  });

  it("is 0 when the balance is the minimum", () => {
    expect(
      freeToSpend(money(1000, "USD"), money(1000, "USD"), money(0, "USD")),
    ).toEqual(money(0, "USD"));
  });

  it("goes below 0 when the balance is under the minimum", () => {
    expect(
      freeToSpend(money(300, "USD"), money(1000, "USD"), money(0, "USD")),
    ).toEqual(money(-700, "USD"));
  });

  it("goes below 0 when goals hold more than the balance leaves", () => {
    expect(
      freeToSpend(money(5000, "THB"), money(0, "THB"), money(8000, "THB")),
    ).toEqual(money(-3000, "THB"));
  });

  it("is the balance when there is no minimum and nothing set aside", () => {
    expect(
      freeToSpend(money(500, "THB"), money(0, "THB"), money(0, "THB")),
    ).toEqual(money(500, "THB"));
  });
});

describe("showsFree", () => {
  it("is true when the account has a minimum", () => {
    expect(
      showsFree({ minimum: money(50000, "LAK"), setAside: money(0, "LAK") }),
    ).toBe(true);
  });

  it("is true when money is set aside for goals", () => {
    expect(
      showsFree({ minimum: money(0, "LAK"), setAside: money(1000, "LAK") }),
    ).toBe(true);
  });

  it("is true when both are above 0", () => {
    expect(
      showsFree({ minimum: money(1000, "USD"), setAside: money(500, "USD") }),
    ).toBe(true);
  });

  it("is false when there is neither", () => {
    expect(
      showsFree({ minimum: money(0, "USD"), setAside: money(0, "USD") }),
    ).toBe(false);
  });
});
