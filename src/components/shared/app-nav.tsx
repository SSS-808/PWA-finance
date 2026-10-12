"use client";

import { House, Plus, ReceiptText, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";

// The Add button sits between History and Accounts
const items = [
  { href: "/", label: en.nav.home, icon: House },
  { href: "/transactions", label: en.nav.history, icon: ReceiptText },
  { href: "/transactions/new", label: en.nav.add, icon: Plus },
  { href: "/accounts", label: en.nav.accounts, icon: Wallet },
  { href: "/settings", label: en.nav.settings, icon: Settings },
];

const ADD_HREF = "/transactions/new";

// Home matches itself, the Budgets pages and the Goals pages; the other pages also match their sub-pages
function isActive(pathname: string | null, href: string): boolean {
  // The Add page has its own button, so it doesn't light up History
  if (pathname === null || pathname === ADD_HREF) return false;
  if (href === "/") {
    return (
      pathname === "/" ||
      pathname === "/budgets" ||
      pathname.startsWith("/budgets/") ||
      pathname === "/goals" ||
      pathname.startsWith("/goals/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Add returns to the page it was opened from; with an unknown address the form falls back to Home
function addHref(pathname: string | null): string {
  if (pathname === null) return ADD_HREF;
  return `${ADD_HREF}?from=${encodeURIComponent(pathname)}`;
}

export function AppNav() {
  return <AppNavFrame pathname={usePathname()} />;
}

// The bar itself; with pathname null nothing is highlighted (used while the address is still unknown)
export function AppNavFrame({ pathname }: { pathname: string | null }) {
  const router = useRouter();
  return (
    <nav
      aria-label={en.nav.label}
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-md rounded-full border border-border bg-card p-1.5 shadow-lg lg:sticky lg:inset-x-auto lg:top-0 lg:bottom-auto lg:mx-0 lg:h-dvh lg:w-56 lg:max-w-none lg:shrink-0 lg:rounded-none lg:border-0 lg:border-r lg:bg-background lg:p-0 lg:shadow-none"
    >
      <p className="hidden px-4 pt-6 pb-4 text-lg font-semibold lg:block">
        {en.app.name}
      </p>
      <ul className="flex items-center lg:flex-col lg:items-stretch lg:gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          if (href === ADD_HREF) {
            return (
              <li
                key={href}
                className="flex flex-1 items-center justify-center lg:flex-none lg:justify-start lg:px-4 lg:py-2"
              >
                <Link
                  href={ADD_HREF}
                  aria-label={label}
                  onClick={(event) => {
                    // The return address is read at the tap, so it is always the page you are on
                    if (event.button !== 0 || event.metaKey || event.ctrlKey)
                      return;
                    event.preventDefault();
                    router.push(addHref(window.location.pathname));
                  }}
                  className="flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Icon className="size-6" aria-hidden="true" />
                </Link>
              </li>
            );
          }
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1 lg:flex-none">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full text-xs lg:mx-2 lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3 lg:text-sm",
                  active
                    ? "bg-primary-soft font-semibold text-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
