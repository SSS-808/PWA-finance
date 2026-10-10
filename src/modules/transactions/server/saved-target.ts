import { safeNextPath } from "@/modules/auth";

// Adds one value to a path on our own site, keeping any other query it has
export function withParam(path: string, name: string, value: string): string {
  const url = new URL(path, "http://localhost");
  url.searchParams.set(name, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

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
