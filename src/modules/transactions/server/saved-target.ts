import { safeNextPath } from "@/modules/auth";

// Only these pages show the "Saved" note, so saving from anywhere else lands on History
export function savedTarget(returnTo: string): string {
  const path = safeNextPath(returnTo);
  const { pathname } = new URL(path, "http://localhost");
  const showsNote =
    pathname === "/" ||
    pathname === "/transactions" ||
    pathname === "/accounts" ||
    /^\/accounts\/[0-9a-f-]{36}$/.test(pathname);
  return showsNote ? path : "/transactions";
}
