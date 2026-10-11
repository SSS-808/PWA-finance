import { describe, expect, it } from "vitest";
import { signupOpenFrom } from "./signup";

describe("signupOpenFrom", () => {
  it("is open only when disable_signup is exactly false", () => {
    expect(signupOpenFrom({ disable_signup: false })).toBe(true);
  });

  it.each([
    ["disable_signup true", { disable_signup: true }],
    ["an empty object", {}],
    ["null", null],
    ["a string", "x"],
    ["an array", []],
    ["the string false", { disable_signup: "false" }],
  ])("is closed for %s", (_label, settings) => {
    expect(signupOpenFrom(settings)).toBe(false);
  });
});
