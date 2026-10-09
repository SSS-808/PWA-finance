"use client";

import { House, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";

const items = [
  { href: "/", label: en.nav.home, icon: House },
  { href: "/settings", label: en.nav.settings, icon: Settings },
];

// Home matches only itself; the other pages also match their sub-pages
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label={en.nav.label}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:sticky lg:top-0 lg:h-dvh lg:w-56 lg:shrink-0 lg:border-t-0 lg:border-r lg:pb-0"
    >
      <p className="hidden px-4 pt-6 pb-4 text-lg font-semibold lg:block">
        {en.app.name}
      </p>
      <ul className="flex lg:flex-col">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1 lg:flex-none">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-sm",
                  active
                    ? "font-medium text-foreground"
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
