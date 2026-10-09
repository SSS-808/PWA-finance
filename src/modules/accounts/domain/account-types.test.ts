import { describe, expect, it } from "vitest";
import { ACCOUNT_TYPES, isAccountType, isDebt } from "./account-types";

describe("ACCOUNT_TYPES", () => {
  it("lists the seven types the database allows", () => {
    expect(ACCOUNT_TYPES).toEqual([
      "cash",
      "bank",
      "savings",
      "credit_card",
      "loan",
      "investment",
      "other",
    ]);
  });
});

describe("isAccountType", () => {
  it.each(ACCOUNT_TYPES)("accepts %s", (type) => {
    expect(isAccountType(type)).toBe(true);
  });

  it.each(["", "Cash", "wallet"])("rejects %j", (value) => {
    expect(isAccountType(value)).toBe(false);
  });
});

describe("isDebt", () => {
  it.each(["credit_card", "loan"] as const)("treats %s as a debt", (type) => {
    expect(isDebt(type)).toBe(true);
  });

  it.each(["cash", "bank", "savings", "investment", "other"] as const)(
    "treats %s as an asset",
    (type) => {
      expect(isDebt(type)).toBe(false);
    },
  );
});
