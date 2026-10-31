import { describe, expect, it } from "vitest";
import { accountLabel } from "./account-label";

describe("accountLabel", () => {
  const none = { free: null, minimum: null };
  const bcelKip = { id: "1", name: "BCEL", currency: "LAK" as const, ...none };
  const bcelUsd = { id: "2", name: "bcel", currency: "USD" as const, ...none };
  const cash = { id: "3", name: "Cash", currency: "LAK" as const, ...none };

  it("keeps a name that no other account uses", () => {
    expect(accountLabel(cash, [bcelKip, bcelUsd, cash])).toBe("Cash");
  });

  it("adds the currency symbol when the name appears more than once", () => {
    const all = [bcelKip, bcelUsd, cash];
    expect(accountLabel(bcelKip, all)).toBe("BCEL · ₭");
    expect(accountLabel(bcelUsd, all)).toBe("bcel · $");
  });

  it("does not count the option itself as a second account", () => {
    expect(accountLabel(bcelKip, [bcelKip])).toBe("BCEL");
  });
});
