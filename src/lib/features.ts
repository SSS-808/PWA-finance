// Feature switches read from the server's environment; a missing value means off

// The iPhone Shortcut stays hidden unless SHORTCUT_ENABLED is "true" (set per environment in Vercel)
export function shortcutEnabled(): boolean {
  return process.env.SHORTCUT_ENABLED === "true";
}
