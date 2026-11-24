import { afterEach, describe, expect, it, vi } from "vitest";
import { shortcutEnabled } from "./features";

describe("shortcutEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off when SHORTCUT_ENABLED is missing", () => {
    vi.stubEnv("SHORTCUT_ENABLED", undefined);
    expect(shortcutEnabled()).toBe(false);
  });

  it("is off for anything but true", () => {
    vi.stubEnv("SHORTCUT_ENABLED", "yes");
    expect(shortcutEnabled()).toBe(false);
  });

  it("is on when SHORTCUT_ENABLED is true", () => {
    vi.stubEnv("SHORTCUT_ENABLED", "true");
    expect(shortcutEnabled()).toBe(true);
  });
});
