import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps paths on our own site", () => {
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/accounts?x=1")).toBe("/accounts?x=1");
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
    ["a relative path", "accounts"],
    ["a protocol-relative URL", "//evil.com"],
    ["a backslash URL", "/\\evil.com"],
    ["an absolute URL", "https://evil.com"],
  ])("falls back to / for %s", (_name, value) => {
    expect(safeNextPath(value)).toBe("/");
  });
});
