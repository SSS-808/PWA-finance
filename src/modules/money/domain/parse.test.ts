import { describe, expect, it } from "vitest";
import type { CurrencyCode } from "./currency";
import { money } from "./money";
import { type ParseMoneyError, parseMoney } from "./parse";

type OkCase = [CurrencyCode, string, number];
type ErrorCase = [CurrencyCode, string, ParseMoneyError];

describe("parseMoney: valid amounts", () => {
  it.each<OkCase>([
    ["LAK", "100000", 100000],
    ["LAK", "100,000", 100000],
    ["LAK", " 1,250,000 ", 1250000],
    ["LAK", "0", 0],
    ["LAK", "007", 7],
    ["LAK", "1000.0", 1000],
    ["LAK", "1000.", 1000],
    ["LAK", "10000000000000", 10000000000000],
    ["USD", "12.50", 1250],
    ["USD", "12.5", 1250],
    ["USD", "12", 1200],
    ["USD", ".5", 50],
    ["USD", "0.05", 5],
    ["USD", "1,250.50", 125050],
    ["USD", "1.050", 105],
    ["USD", "100000000000.00", 10000000000000],
    ["THB", "350.25", 35025],
  ])("%s %j parses to %i", (currency, input, minor) => {
    expect(parseMoney(input, currency)).toEqual({
      ok: true,
      value: money(minor, currency),
    });
  });
});

describe("parseMoney: errors", () => {
  it.each<ErrorCase>([
    ["LAK", "", "empty"],
    ["LAK", "   ", "empty"],
    ["LAK", "abc", "invalid"],
    ["LAK", "1.2.3", "invalid"],
    ["LAK", "12a", "invalid"],
    ["LAK", "--5", "invalid"],
    ["LAK", "+5", "invalid"],
    ["LAK", "1e5", "invalid"],
    ["LAK", "Infinity", "invalid"],
    ["LAK", "0x10", "invalid"],
    ["LAK", "1 000", "invalid"],
    ["LAK", ".", "invalid"],
    ["LAK", "-", "invalid"],
    ["LAK", ",", "invalid"],
    ["LAK", "-5", "negative"],
    ["LAK", "1000.5", "too_many_decimals"],
    ["LAK", "10000000000001", "too_large"],
    ["LAK", "99999999999999999999", "too_large"],
    ["USD", "1.005", "too_many_decimals"],
    ["USD", "100000000000.01", "too_large"],
  ])("%s %j fails with %s", (currency, input, error) => {
    expect(parseMoney(input, currency)).toEqual({ ok: false, error });
  });
});

describe("parseMoney: allowNegative", () => {
  it("accepts a minus sign when allowed", () => {
    expect(parseMoney("-5", "LAK", { allowNegative: true })).toEqual({
      ok: true,
      value: money(-5, "LAK"),
    });
  });

  it("parses -0 as a positive zero", () => {
    const result = parseMoney("-0", "LAK", { allowNegative: true });
    expect(result).toEqual({ ok: true, value: money(0, "LAK") });
    expect(result.ok && Object.is(result.value.minor, 0)).toBe(true);
  });

  it("still rejects a bare minus sign", () => {
    expect(parseMoney("-", "USD", { allowNegative: true })).toEqual({
      ok: false,
      error: "invalid",
    });
  });
});
