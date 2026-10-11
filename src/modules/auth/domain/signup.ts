// Reads Supabase's public auth settings; anything unexpected counts as closed
export function signupOpenFrom(settings: unknown): boolean {
  if (typeof settings !== "object" || settings === null) return false;
  return (settings as { disable_signup?: unknown }).disable_signup === false;
}
