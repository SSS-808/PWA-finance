"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

// Shows a toast when ?<param> is in the URL, then removes that param so a reload does not repeat it
export function ToastOnce({
  message,
  param,
}: {
  message: string;
  param: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const present = searchParams.has(param);

  useEffect(() => {
    if (!present) return;
    toast(message, { id: `${param}:${message}` });
    const next = new URLSearchParams(window.location.search);
    next.delete(param);
    const query = next.toString();
    // Passing the current state keeps Next.js from restoring a stale page tree
    window.history.replaceState(
      window.history.state,
      "",
      query ? `${pathname}?${query}` : pathname,
    );
  }, [present, message, param, pathname]);

  return null;
}
