import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// The back link above a page: a chevron and where it goes
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-1 text-base font-medium text-primary"
    >
      <ChevronLeft className="size-5" aria-hidden="true" />
      <span className="break-words">{label}</span>
    </Link>
  );
}
